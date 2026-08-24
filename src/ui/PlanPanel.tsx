import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { needsTeslaAccessWarning } from '../lib/planner';
import { formatKm, formatMin } from '../lib/geo';
import { powerColor, powerLabel, radius, socColor, space, type Palette } from '../theme';
import { Badge, Card, Divider, Row, Stat, makeText } from './Primitives';
import type { PlannedStop, TripPlan, Vehicle } from '../types';

/**
 * Yolculuk boyunca şarj seviyesini gösteren şerit. Her bölüm mesafeyle
 * orantılı genişlikte, o bölümde inilen en düşük yüzdeye göre renkli.
 */
function TripStrip({
  p,
  plan,
  startSoc,
}: {
  p: Palette;
  plan: TripPlan;
  startSoc: number;
}) {
  const t = makeText(p);
  const legs: { km: number; minSoc: number }[] = [];
  let prevKm = 0;
  let soc = startSoc;
  for (const s of plan.stops) {
    legs.push({ km: s.charger.routeKm - prevKm, minSoc: s.arriveSoc });
    prevKm = s.charger.routeKm;
    soc = s.departSoc;
  }
  legs.push({ km: Math.max(0.1, plan.distanceKm - plan.detourKm - prevKm), minSoc: plan.arrivalSoc });

  return (
    <View>
      <Row style={{ height: 12, gap: 3 }}>
        {legs.map((l, i) => (
          <React.Fragment key={`leg-${i}`}>
            <View
              style={{
                flex: Math.max(l.km, 0.1),
                height: 10,
                borderRadius: 5,
                backgroundColor: socColor(p, l.minSoc),
                opacity: 0.85,
              }}
            />
            {i < plan.stops.length ? (
              <View
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  borderWidth: 2.5,
                  borderColor: powerColor(
                    p,
                    plan.stops[i].effectiveKw,
                    true,
                  ),
                  backgroundColor: p.surface,
                }}
              />
            ) : null}
          </React.Fragment>
        ))}
      </Row>
      <Row style={{ justifyContent: 'space-between', marginTop: 5 }}>
        <Text style={t.faint}>Kalkış %{Math.round(startSoc)}</Text>
        <Text style={[t.faint, { color: socColor(p, plan.arrivalSoc) }]}>
          Varış %{Math.round(plan.arrivalSoc)}
        </Text>
      </Row>
    </View>
  );
}

function StopCard({
  p,
  stop,
  index,
  vehicle,
  onOpenMaps,
  onFocus,
}: {
  p: Palette;
  stop: PlannedStop;
  index: number;
  vehicle: Vehicle;
  onOpenMaps: (stop: PlannedStop) => void;
  onFocus: (stop: PlannedStop) => void;
}) {
  const t = makeText(p);
  const [open, setOpen] = useState(false);
  const color = powerColor(p, stop.effectiveKw, true);
  const teslaWarn = needsTeslaAccessWarning(stop.charger, vehicle);

  return (
    <Card p={p} style={{ marginBottom: space.md, padding: space.md }}>
      <Pressable onPress={() => onFocus(stop)}>
        <Row style={{ alignItems: 'flex-start', gap: space.md }}>
          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
              {index + 1}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={t.h3} numberOfLines={2}>
              {stop.charger.name}
            </Text>
            <Text style={[t.faint, { marginTop: 2 }]}>
              {Math.round(stop.charger.routeKm)}. km
              {stop.charger.operator ? ` · ${stop.charger.operator}` : ''}
              {stop.charger.detourKm >= 0.3
                ? ` · ${formatKm(stop.charger.detourKm)} sapma`
                : ' · rota üstünde'}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: p.text, fontSize: 19, fontWeight: '800' }}>
              {Math.round(stop.chargeMin)}
            </Text>
            <Text style={t.faint}>dakika</Text>
          </View>
        </Row>
      </Pressable>

      <Row style={{ marginTop: space.md, gap: space.md }}>
        <View style={{ flex: 1 }}>
          <Text style={t.label}>Şarj</Text>
          <Row gap={5}>
            <Text style={{ color: socColor(p, stop.arriveSoc), fontWeight: '700', fontSize: 15 }}>
              %{Math.round(stop.arriveSoc)}
            </Text>
            <Text style={{ color: p.textFaint, fontSize: 13 }}>→</Text>
            <Text style={{ color: p.ok, fontWeight: '700', fontSize: 15 }}>
              %{Math.round(stop.departSoc)}
            </Text>
          </Row>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={t.label}>Güç</Text>
          <Text style={{ color: color, fontWeight: '700', fontSize: 15 }}>
            {stop.charger.kwEstimated ? '~' : ''}
            {Math.round(stop.effectiveKw)} kW
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={t.label}>Alınan</Text>
          <Text style={{ color: p.text, fontWeight: '700', fontSize: 15 }}>
            {stop.addedKwh.toFixed(1)} kWh
          </Text>
        </View>
      </Row>

      <Text style={[t.faint, { marginTop: space.sm }]}>Neden burada: {stop.why}</Text>

      {teslaWarn ? (
        <Text style={[t.faint, { marginTop: 6, color: p.warn }]}>
          Tesla işletmeli istasyon — bazı lokasyonlar diğer markalara kapalı
          olabilir. Tesla uygulamasından teyit et.
        </Text>
      ) : null}

      <Row style={{ marginTop: space.md, gap: space.sm }}>
        <Pressable
          onPress={() => onOpenMaps(stop)}
          style={({ pressed }) => ({
            flex: 1,
            paddingVertical: 10,
            borderRadius: radius.sm,
            backgroundColor: pressed ? p.surfaceAlt : 'transparent',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: p.border,
            alignItems: 'center',
          })}
        >
          <Text style={{ color: p.text, fontWeight: '600', fontSize: 13 }}>
            Haritalar'da aç
          </Text>
        </Pressable>
        {stop.alternatives.length > 0 ? (
          <Pressable
            onPress={() => setOpen((v) => !v)}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 10,
              borderRadius: radius.sm,
              backgroundColor: pressed ? p.surfaceAlt : 'transparent',
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: p.border,
              alignItems: 'center',
            })}
          >
            <Text style={{ color: p.text, fontWeight: '600', fontSize: 13 }}>
              {open ? 'Alternatifleri kapat' : `${stop.alternatives.length} alternatif`}
            </Text>
          </Pressable>
        ) : null}
      </Row>

      {open
        ? stop.alternatives.map((a) => (
            <Pressable
              key={a.charger.id}
              onPress={() => onFocus({ ...stop, charger: a.charger })}
              style={{
                marginTop: space.sm,
                paddingTop: space.sm,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderColor: p.border,
              }}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[t.body, { fontWeight: '600' }]} numberOfLines={1}>
                    {a.charger.name}
                  </Text>
                  <Text style={t.faint}>{a.reason}</Text>
                </View>
                <Badge
                  p={p}
                  label={`${Math.round(a.charger.maxKw)} kW`}
                  color={powerColor(p, a.charger.maxKw, a.charger.isDc)}
                />
              </Row>
            </Pressable>
          ))
        : null}
    </Card>
  );
}

export function PlanPanel({
  p,
  plan,
  vehicle,
  startSoc,
  chargerCount,
  sources,
  onOpenMaps,
  onFocus,
}: {
  p: Palette;
  plan: TripPlan;
  vehicle: Vehicle;
  startSoc: number;
  chargerCount: number;
  sources: string[];
  onOpenMaps: (stop: PlannedStop) => void;
  onFocus: (stop: PlannedStop) => void;
}) {
  const t = makeText(p);

  return (
    <ScrollView
      contentContainerStyle={{ padding: space.lg, paddingTop: space.md }}
      showsVerticalScrollIndicator={false}
    >
      {!plan.feasible ? (
        <Card
          p={p}
          style={{
            marginBottom: space.md,
            borderColor: p.danger,
            borderWidth: 1.5,
          }}
        >
          <Text style={[t.h3, { color: p.danger }]}>Bu plan tamamlanamıyor</Text>
          <Text style={[t.dim, { marginTop: 6 }]}>{plan.reason}</Text>
        </Card>
      ) : null}

      <Card p={p} style={{ marginBottom: space.md }}>
        <Row style={{ marginBottom: space.lg }}>
          <Stat p={p} value={formatMin(plan.totalMin)} label="Toplam süre" />
          <Stat p={p} value={formatKm(plan.distanceKm)} label="Mesafe" />
          <Stat
            p={p}
            value={plan.stops.length === 0 ? '—' : String(plan.stops.length)}
            label="Şarj molası"
          />
          <Stat
            p={p}
            value={`%${Math.round(plan.arrivalSoc)}`}
            label="Varışta"
            color={socColor(p, plan.arrivalSoc)}
          />
        </Row>

        <TripStrip p={p} plan={plan} startSoc={startSoc} />

        <Divider p={p} />

        <Row style={{ flexWrap: 'wrap', gap: space.md }}>
          <Text style={t.faint}>
            Sürüş {formatMin(plan.driveMin)}
            {plan.chargeMin > 0 ? ` + şarj ${formatMin(plan.chargeMin)}` : ''}
          </Text>
          <Text style={t.faint}>
            {Math.round(plan.effectiveWhPerKm)} Wh/km hesaplandı
          </Text>
          {plan.detourKm > 0.2 ? (
            <Text style={t.faint}>+{formatKm(plan.detourKm)} sapma</Text>
          ) : null}
        </Row>
      </Card>

      {plan.stops.length > 0 ? (
        <>
          <Text style={[t.label, { marginBottom: space.sm }]}>
            Şarj planı — {plan.stops.length} durak
          </Text>
          {plan.stops.map((s, i) => (
            <StopCard
              key={`${s.charger.id}-${i}`}
              p={p}
              stop={s}
              index={i}
              vehicle={vehicle}
              onOpenMaps={onOpenMaps}
              onFocus={onFocus}
            />
          ))}
        </>
      ) : null}

      {plan.advisories.length > 0 ? (
        <Card p={p} style={{ marginBottom: space.md }}>
          <Text style={[t.label, { marginBottom: space.sm }]}>Öneriler</Text>
          {plan.advisories.map((a, i) => (
            <Row key={i} style={{ alignItems: 'flex-start', marginBottom: space.sm }}>
              <Text style={{ color: p.accent, fontSize: 14, lineHeight: 20 }}>•</Text>
              <Text style={[t.dim, { flex: 1 }]}>{a}</Text>
            </Row>
          ))}
        </Card>
      ) : null}

      <Text style={[t.faint, { textAlign: 'center', marginTop: space.sm }]}>
        Koridorda {chargerCount} istasyon tarandı
        {sources.length > 0 ? ` · ${sources.join(' + ')}` : ''}
      </Text>
      <Text style={[t.faint, { textAlign: 'center', marginTop: 4 }]}>
        Süreler tahminidir; hava, yük ve trafik sonucu değiştirir.
      </Text>
    </ScrollView>
  );
}

export { powerLabel };
