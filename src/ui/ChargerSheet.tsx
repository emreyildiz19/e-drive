import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CONNECTOR_LABEL, isDcType } from '../lib/api/chargers';
import { estimateCharge } from '../lib/energy';
import { anyCompatible, effectiveKw, needsTeslaAccessWarning } from '../lib/planner';
import { formatKm } from '../lib/geo';
import { powerColor, powerLabel, space, type Palette } from '../theme';
import { Badge, Button, Card, Divider, Row, makeText } from './Primitives';
import { Sheet } from './Sheet';
import type { Charger, RouteCharger, Vehicle } from '../types';

export function ChargerSheet({
  p,
  charger,
  vehicle,
  startSoc,
  maxChargePct,
  distanceKm,
  onClose,
  onOpenMaps,
}: {
  p: Palette;
  charger: Charger | RouteCharger | null;
  vehicle: Vehicle;
  startSoc: number;
  maxChargePct: number;
  distanceKm?: number;
  onClose: () => void;
  onOpenMaps: (c: Charger) => void;
}) {
  const t = makeText(p);
  if (!charger) return null;

  const color = powerColor(p, charger.maxKw, charger.isDc);
  const compatible = anyCompatible(charger, vehicle);
  const effKw = effectiveKw(charger, vehicle);
  const est = charger.isDc && compatible
    ? estimateCharge(vehicle, effKw, true, Math.min(startSoc, maxChargePct - 5), maxChargePct)
    : null;
  const routeKm = (charger as RouteCharger).routeKm;
  const detourKm = (charger as RouteCharger).detourKm;

  return (
    <Sheet
      p={p}
      visible={charger !== null}
      title={charger.name}
      onClose={onClose}
      footer={
        <Button
          p={p}
          title="Haritalar'da yol tarifi al"
          onPress={() => onOpenMaps(charger)}
        />
      }
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}
        style={{ maxHeight: 460 }}
      >
        <Row style={{ flexWrap: 'wrap', gap: space.md, marginBottom: space.md }}>
          <Badge
            p={p}
            label={`${charger.kwEstimated ? '~' : ''}${Math.round(charger.maxKw)} kW · ${powerLabel(charger.maxKw, charger.isDc)}`}
            color={color}
          />
          {charger.operator ? (
            <Badge p={p} label={charger.operator} color={p.textFaint} />
          ) : null}
          {charger.open24 ? <Badge p={p} label="24 saat açık" color={p.ok} /> : null}
          {charger.capacity ? (
            <Badge p={p} label={`${charger.capacity} soket`} color={p.textFaint} />
          ) : null}
          <Badge
            p={p}
            label={charger.source === 'osm' ? 'OpenStreetMap' : 'Open Charge Map'}
            color={p.textFaint}
          />
        </Row>

        {charger.address ? (
          <Text style={[t.dim, { marginBottom: space.md }]}>{charger.address}</Text>
        ) : null}

        {!compatible ? (
          <Card p={p} style={{ borderColor: p.danger, borderWidth: 1.5, marginBottom: space.md }}>
            <Text style={[t.h3, { color: p.danger }]}>Aracınla uyumlu değil</Text>
            <Text style={[t.dim, { marginTop: 4 }]}>
              Bu istasyonda {vehicle.dcConnector} veya {vehicle.acConnector}{' '}
              konnektörü görünmüyor.
            </Text>
          </Card>
        ) : null}

        {needsTeslaAccessWarning(charger, vehicle) ? (
          <Card p={p} style={{ borderColor: p.warn, borderWidth: 1, marginBottom: space.md }}>
            <Text style={[t.body, { color: p.warn }]}>
              Tesla işletmeli istasyon. Avrupa'da konnektör CCS2'dir ama her
              lokasyon diğer markalara açık değildir — Tesla uygulamasından
              kontrol et.
            </Text>
          </Card>
        ) : null}

        <Text style={[t.label, { marginBottom: space.sm }]}>Konnektörler</Text>
        {charger.connectors.map((c, i) => {
          const usable =
            c.type === vehicle.dcConnector ||
            c.type === vehicle.acConnector ||
            (c.type === 'TESLA' && vehicle.dcConnector === 'CCS2');
          return (
            <Row
              key={`${c.type}-${i}`}
              style={{
                justifyContent: 'space-between',
                paddingVertical: space.sm,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderColor: p.border,
              }}
            >
              <Row gap={space.sm}>
                <Text style={[t.body, { fontWeight: '600' }]}>
                  {CONNECTOR_LABEL[c.type]}
                </Text>
                {c.count && c.count > 1 ? (
                  <Text style={t.faint}>×{c.count}</Text>
                ) : null}
                {usable ? null : <Text style={t.faint}>(uyumsuz)</Text>}
              </Row>
              <Text
                style={{
                  color: powerColor(p, c.kw ?? 0, isDcType(c.type)),
                  fontWeight: '700',
                  fontSize: 14,
                }}
              >
                {charger.kwEstimated ? '~' : ''}
                {Math.round(c.kw ?? 0)} kW
              </Text>
            </Row>
          );
        })}

        {charger.connectorsEstimated ? (
          <Text style={[t.faint, { marginTop: space.sm }]}>
            Konnektör tipi açık veride belirtilmemiş; güce göre en olası tip
            varsayıldı. Yerinde farklı olabilir.
          </Text>
        ) : charger.kwEstimated ? (
          <Text style={[t.faint, { marginTop: space.sm }]}>
            Güç değeri açık veride yok; konnektör tipine göre temkinli tahmin
            edildi. Gerçek güç daha yüksek olabilir.
          </Text>
        ) : null}

        <Divider p={p} />

        <Row style={{ flexWrap: 'wrap', gap: space.lg }}>
          {distanceKm != null ? (
            <View>
              <Text style={t.label}>Sana uzaklık</Text>
              <Text style={t.h3}>{formatKm(distanceKm)}</Text>
            </View>
          ) : null}
          {routeKm != null ? (
            <View>
              <Text style={t.label}>Rotada</Text>
              <Text style={t.h3}>{Math.round(routeKm)}. km</Text>
            </View>
          ) : null}
          {detourKm != null ? (
            <View>
              <Text style={t.label}>Sapma</Text>
              <Text style={t.h3}>{formatKm(detourKm)}</Text>
            </View>
          ) : null}
        </Row>

        {est ? (
          <Card p={p} style={{ marginTop: space.lg }}>
            <Text style={t.label}>Tahmini şarj</Text>
            <Text style={[t.h2, { marginTop: 4 }]}>
              %{Math.round(Math.min(startSoc, maxChargePct - 5))} → %{maxChargePct} ·{' '}
              {Math.round(est.minutes)} dk
            </Text>
            <Text style={[t.faint, { marginTop: 4 }]}>
              {est.kwh.toFixed(1)} kWh · ortalama {Math.round(est.avgKw)} kW ·{' '}
              {vehicle.brand} {vehicle.model} için
            </Text>
          </Card>
        ) : null}

        {charger.fee === false ? (
          <Text style={[t.faint, { marginTop: space.md }]}>
            Açık veride ücretsiz olarak işaretli.
          </Text>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}
