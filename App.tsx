import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { fetchChargersAlongRoute, fetchChargersNear } from './src/lib/api/chargers';
import { reverseGeocode } from './src/lib/api/geocode';
import { humanError } from './src/lib/api/http';
import { getRoute } from './src/lib/api/routing';
import { makeEnergyContext } from './src/lib/energy';
import { formatKm, haversineKm, regionFor, thinRoute } from './src/lib/geo';
import { anyCompatible, effectiveKw, planTrip, projectChargers } from './src/lib/planner';
import { SettingsProvider, useSettings } from './src/store/settings';
import { palettes, powerColor, radius, socColor, space } from './src/theme';
import { ChargerSheet } from './src/ui/ChargerSheet';
import { PlanPanel } from './src/ui/PlanPanel';
import { Button, Card, Row, Slider, makeText } from './src/ui/Primitives';
import { SearchSheet } from './src/ui/SearchSheet';
import { SettingsSheet } from './src/ui/SettingsSheet';
import { VehicleSheet } from './src/ui/VehicleSheet';
import type {
  Charger,
  LatLng,
  Place,
  PlannedStop,
  RouteCharger,
  RouteResult,
} from './src/types';

/** Haritada gösterilecek en fazla istasyon (performans için). */
const MAX_MARKERS = 140;
/** Koridor taramasında rota kaç km'de bir örneklenir. */
const CORRIDOR_SAMPLE_KM = 12;
/** Şarj istasyonu aramasında koridor yarıçapı için alt sınır. */
const MIN_CORRIDOR_KM = 6;

const TURKEY_REGION = {
  latitude: 39.2,
  longitude: 34.5,
  latitudeDelta: 9,
  longitudeDelta: 9,
};

type Phase = 'idle' | 'routing' | 'chargers' | 'done';

function openInMaps(lat: number, lon: number, label: string) {
  const q = encodeURIComponent(label);
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${lat},${lon}&q=${q}&dirflg=d`
      : `geo:${lat},${lon}?q=${lat},${lon}(${q})`;
  Linking.openURL(url).catch(() => {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`);
  });
}

function Screen() {
  const scheme = useColorScheme();
  const p = palettes[scheme === 'dark' ? 'dark' : 'light'];
  const t = makeText(p);
  const insets = useSafeAreaInsets();
  const { settings, update, vehicle, planOptions, ready } = useSettings();

  const mapRef = useRef<MapView | null>(null);

  const [current, setCurrent] = useState<LatLng | null>(null);
  const [currentLabel, setCurrentLabel] = useState('Konumum');
  const [locError, setLocError] = useState<string | null>(null);

  const [origin, setOrigin] = useState<Place | null>(null);
  const [destination, setDestination] = useState<Place | null>(null);

  const [route, setRoute] = useState<RouteResult | null>(null);
  const [rawChargers, setRawChargers] = useState<Charger[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const [searchFor, setSearchFor] = useState<'origin' | 'destination' | null>(null);
  const [showVehicle, setShowVehicle] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selected, setSelected] = useState<Charger | null>(null);

  // ── Konum ────────────────────────────────────────────────────────

  const locate = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocError('Konum izni verilmedi. Kalkış noktasını elle seçebilirsin.');
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const point = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setCurrent(point);
      setLocError(null);
      reverseGeocode(point).then((place) => {
        if (place) setCurrentLabel(place.label || 'Konumum');
      });
      return point;
    } catch (e) {
      setLocError(humanError(e));
      return null;
    }
  }, []);

  useEffect(() => {
    locate().then((point) => {
      if (point && mapRef.current) {
        mapRef.current.animateToRegion(
          { ...point, latitudeDelta: 0.35, longitudeDelta: 0.35 },
          800,
        );
      }
    });
  }, [locate]);

  const originPoint: LatLng | null = origin
    ? { latitude: origin.latitude, longitude: origin.longitude }
    : current;
  const originName = origin?.label ?? currentLabel;

  // ── Plan hesabı (ayar değişince anında yeniden hesaplanır) ───────

  const projected = useMemo<RouteCharger[]>(() => {
    if (!route || rawChargers.length === 0) return [];
    // Sapma filtresi plan aşamasında uygulanır; burada geniş tutulur ki
    // kaydırıcı oynatıldığında yeniden izdüşüm gerekmesin.
    return projectChargers(rawChargers, route, 30);
  }, [route, rawChargers]);

  const inCorridor = useMemo(
    () => projected.filter((c) => c.detourKm <= settings.maxDetourKm),
    [projected, settings.maxDetourKm],
  );

  const plan = useMemo(() => {
    if (!route) return null;
    const ctx = makeEnergyContext(
      vehicle,
      route.segments,
      route.distanceKm,
      planOptions.tempC,
      planOptions.style,
    );
    return planTrip({
      route,
      ctx,
      vehicle,
      startSoc: settings.startSoc,
      chargers: inCorridor,
      opts: planOptions,
    });
  }, [route, vehicle, planOptions, settings.startSoc, inCorridor]);

  // ── Akış ────────────────────────────────────────────────────────

  const runPlan = useCallback(async () => {
    setError(null);
    if (!destination) {
      setSearchFor('destination');
      return;
    }
    let from = originPoint;
    if (!from) {
      from = await locate();
      if (!from) {
        setSearchFor('origin');
        return;
      }
    }

    try {
      setPhase('routing');
      setRoute(null);
      setRawChargers([]);
      const r = await getRoute(
        from,
        { latitude: destination.latitude, longitude: destination.longitude },
        settings.orsKey,
      );
      setRoute(r);

      const region = regionFor(r.points, 0.35);
      mapRef.current?.animateToRegion(region, 700);

      setPhase('chargers');
      const sampled = thinRoute(r.points, r.cums, CORRIDOR_SAMPLE_KM);
      const radiusKm = Math.max(settings.maxDetourKm + 2, MIN_CORRIDOR_KM);
      const res = await fetchChargersAlongRoute(
        sampled.points,
        radiusKm,
        settings.ocmKey,
      );
      setRawChargers(res.chargers);
      setSources(res.sources);
      setWarnings(res.warnings);
      setPhase('done');
      setExpanded(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );
    } catch (e) {
      setError(humanError(e));
      setPhase(route ? 'done' : 'idle');
    }
  }, [destination, originPoint, locate, settings.orsKey, settings.ocmKey, settings.maxDetourKm, route]);

  const showNearby = useCallback(async () => {
    const from = current ?? (await locate());
    if (!from) return;
    setError(null);
    setPhase('chargers');
    try {
      const res = await fetchChargersNear(from, 30, settings.ocmKey);
      setRoute(null);
      setRawChargers(res.chargers);
      setSources(res.sources);
      setWarnings(res.warnings);
      setPhase('idle');
      mapRef.current?.animateToRegion(
        { ...from, latitudeDelta: 0.55, longitudeDelta: 0.55 },
        700,
      );
    } catch (e) {
      setError(humanError(e));
      setPhase('idle');
    }
  }, [current, locate, settings.ocmKey]);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setRawChargers([]);
    setDestination(null);
    setPhase('idle');
    setError(null);
    setExpanded(false);
  }, []);

  // ── Haritada gösterilecek işaretler ─────────────────────────────

  const stopIds = useMemo(
    () => new Set(plan?.stops.map((s) => s.charger.id) ?? []),
    [plan],
  );

  const markers = useMemo(() => {
    const base: (Charger | RouteCharger)[] = route ? inCorridor : rawChargers;
    const filtered = base.filter((c) => {
      if (stopIds.has(c.id)) return false;
      if (settings.onlyDc && !c.isDc) return false;
      return true;
    });
    // Gösterim sınırını aşarsak en güçlü ve uyumlu olanları önceliklendir.
    return filtered
      .sort((a, b) => {
        const ca = anyCompatible(a, vehicle) ? 1 : 0;
        const cb = anyCompatible(b, vehicle) ? 1 : 0;
        if (ca !== cb) return cb - ca;
        return b.maxKw - a.maxKw;
      })
      .slice(0, MAX_MARKERS);
  }, [route, inCorridor, rawChargers, stopIds, settings.onlyDc, vehicle]);

  const busy = phase === 'routing' || phase === 'chargers';
  const panelHeight = expanded && plan ? '76%' : plan ? '42%' : undefined;

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: p.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={p.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={TURKEY_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {route ? (
          <Polyline
            coordinates={route.points}
            strokeColor={p.accent}
            strokeWidth={5}
          />
        ) : null}

        {markers.map((c) => (
          <Marker
            key={c.id}
            coordinate={{ latitude: c.lat, longitude: c.lon }}
            pinColor={powerColor(p, c.maxKw, c.isDc)}
            onPress={() => setSelected(c)}
            tracksViewChanges={false}
          />
        ))}

        {plan?.stops.map((s, i) => (
          <Marker
            key={`stop-${s.charger.id}`}
            coordinate={{ latitude: s.charger.lat, longitude: s.charger.lon }}
            onPress={() => setSelected(s.charger)}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: powerColor(p, s.effectiveKw, true),
                borderWidth: 2.5,
                borderColor: '#fff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                {i + 1}
              </Text>
            </View>
          </Marker>
        ))}

        {destination ? (
          <Marker
            coordinate={{
              latitude: destination.latitude,
              longitude: destination.longitude,
            }}
            title={destination.label}
            tracksViewChanges={false}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: p.text,
                borderWidth: 4,
                borderColor: '#fff',
              }}
            />
          </Marker>
        ) : null}
      </MapView>

      {/* ── Üst arama çubuğu ─────────────────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + space.sm,
          left: space.md,
          right: space.md,
          gap: space.sm,
        }}
      >
        <Card p={p} style={{ padding: space.sm, gap: 2 }}>
          <Pressable
            onPress={() => setSearchFor('origin')}
            style={{ paddingVertical: 9, paddingHorizontal: space.sm }}
          >
            <Row gap={space.sm}>
              <View
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: p.slow,
                }}
              />
              <Text style={[t.body, { flex: 1 }]} numberOfLines={1}>
                {originPoint ? originName : 'Kalkış noktası seç'}
              </Text>
            </Row>
          </Pressable>
          <View
            style={{
              height: StyleSheet.hairlineWidth,
              backgroundColor: p.border,
              marginLeft: 26,
            }}
          />
          <Pressable
            onPress={() => setSearchFor('destination')}
            style={{ paddingVertical: 9, paddingHorizontal: space.sm }}
          >
            <Row gap={space.sm}>
              <View
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 2,
                  backgroundColor: p.text,
                }}
              />
              <Text
                style={[
                  t.body,
                  { flex: 1, color: destination ? p.text : p.textFaint },
                ]}
                numberOfLines={1}
              >
                {destination?.label ?? 'Nereye gidiyorsun?'}
              </Text>
              {route ? (
                <Pressable onPress={clearRoute} hitSlop={10}>
                  <Text style={{ color: p.textDim, fontSize: 15 }}>✕</Text>
                </Pressable>
              ) : null}
            </Row>
          </Pressable>
        </Card>

        {error ? (
          <Card p={p} style={{ padding: space.md, borderColor: p.danger, borderWidth: 1 }}>
            <Text style={[t.dim, { color: p.danger }]}>{error}</Text>
          </Card>
        ) : null}

        {warnings.length > 0 && !error ? (
          <Card p={p} style={{ padding: space.md, borderColor: p.warn, borderWidth: 1 }}>
            <Text style={[t.faint, { color: p.warn }]}>{warnings[0]}</Text>
          </Card>
        ) : null}

        {locError && !originPoint ? (
          <Card p={p} style={{ padding: space.md }}>
            <Text style={t.faint}>{locError}</Text>
          </Card>
        ) : null}
      </View>

      {/* ── Sağ üst yardımcı düğmeler ─────────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          right: space.md,
          top: insets.top + 108,
          gap: space.sm,
        }}
      >
        <RoundButton p={p} label="◎" onPress={locate} />
        <RoundButton p={p} label="⚙" onPress={() => setShowSettings(true)} />
        {!route ? <RoundButton p={p} label="⚡" onPress={showNearby} /> : null}
      </View>

      {/* ── Alt panel ─────────────────────────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: panelHeight as never,
          backgroundColor: p.bg,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: Math.max(insets.bottom, space.md),
          borderTopWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
        }}
      >
        {plan ? (
          <>
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              style={{ alignItems: 'center', paddingTop: space.sm }}
              hitSlop={10}
            >
              <View
                style={{
                  width: 42,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: p.border,
                }}
              />
            </Pressable>
            <View style={{ flex: 1 }}>
              <PlanPanel
                p={p}
                plan={plan}
                vehicle={vehicle}
                startSoc={settings.startSoc}
                chargerCount={inCorridor.length}
                sources={sources}
                onOpenMaps={(s: PlannedStop) =>
                  openInMaps(s.charger.lat, s.charger.lon, s.charger.name)
                }
                onFocus={(s: PlannedStop) => {
                  setExpanded(false);
                  mapRef.current?.animateToRegion(
                    {
                      latitude: s.charger.lat,
                      longitude: s.charger.lon,
                      latitudeDelta: 0.08,
                      longitudeDelta: 0.08,
                    },
                    600,
                  );
                }}
              />
            </View>
          </>
        ) : (
          <View style={{ padding: space.lg, gap: space.md }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Pressable onPress={() => setShowVehicle(true)} style={{ flex: 1 }}>
                <Text style={t.label}>Araç</Text>
                <Text style={t.h3} numberOfLines={1}>
                  {vehicle.brand === 'Diğer'
                    ? 'Elle girilen araç'
                    : `${vehicle.brand} ${vehicle.model}`}
                </Text>
                <Text style={t.faint}>
                  {vehicle.batteryKwh} kWh · {vehicle.maxDcKw} kW DC ·{' '}
                  {vehicle.dcConnector} · değiştir
                </Text>
              </Pressable>
            </Row>

            <View>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={t.label}>Mevcut şarj</Text>
                <Text
                  style={{
                    color: socColor(p, settings.startSoc),
                    fontWeight: '800',
                    fontSize: 16,
                  }}
                >
                  %{settings.startSoc}
                </Text>
              </Row>
              <Slider
                p={p}
                value={settings.startSoc}
                min={1}
                max={100}
                step={1}
                onChange={(v) => update({ startSoc: v })}
                color={socColor(p, settings.startSoc)}
              />
            </View>

            <Button
              p={p}
              title={busy ? 'Hesaplanıyor…' : 'Rotayı ve şarj planını çıkar'}
              loading={busy}
              onPress={runPlan}
            />

            {rawChargers.length > 0 && !route ? (
              <Text style={[t.faint, { textAlign: 'center' }]}>
                Çevrede {rawChargers.length} istasyon bulundu — haritadan birine
                dokun.
              </Text>
            ) : (
              <Text style={[t.faint, { textAlign: 'center' }]}>
                ⚡ düğmesi çevredeki istasyonları gösterir.
              </Text>
            )}
          </View>
        )}
      </View>

      {/* ── Paneller ──────────────────────────────────────────────── */}
      <SearchSheet
        p={p}
        visible={searchFor !== null}
        title={searchFor === 'origin' ? 'Kalkış noktası' : 'Varış noktası'}
        near={current}
        onClose={() => setSearchFor(null)}
        onPick={(place) => {
          if (searchFor === 'origin') setOrigin(place);
          else setDestination(place);
          setSearchFor(null);
        }}
        onUseCurrent={
          searchFor === 'origin'
            ? () => {
                setOrigin(null);
                locate();
                setSearchFor(null);
              }
            : undefined
        }
      />

      <VehicleSheet p={p} visible={showVehicle} onClose={() => setShowVehicle(false)} />
      <SettingsSheet p={p} visible={showSettings} onClose={() => setShowSettings(false)} />

      <ChargerSheet
        p={p}
        charger={selected}
        vehicle={vehicle}
        startSoc={settings.startSoc}
        maxChargePct={settings.maxChargePct}
        distanceKm={
          selected && current
            ? haversineKm(current, {
                latitude: selected.lat,
                longitude: selected.lon,
              })
            : undefined
        }
        onClose={() => setSelected(null)}
        onOpenMaps={(c) => openInMaps(c.lat, c.lon, c.name)}
      />
    </View>
  );
}

function RoundButton({
  p,
  label,
  onPress,
}: {
  p: (typeof palettes)['dark'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: radius.pill,
        backgroundColor: p.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: p.text, fontSize: 18 }}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <Screen />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
