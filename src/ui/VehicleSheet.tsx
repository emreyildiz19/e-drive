import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { brands, modelsOf, nominalRangeKm } from '../data/vehicles';
import { useSettings } from '../store/settings';
import { radius, space, type Palette } from '../theme';
import { Badge, Button, Card, Divider, Row, makeText } from './Primitives';
import { Sheet } from './Sheet';
import type { Vehicle } from '../types';

/** Marka → model seçimi. Özellikler veritabanından otomatik gelir. */
export function VehicleSheet({
  p,
  visible,
  onClose,
}: {
  p: Palette;
  visible: boolean;
  onClose: () => void;
}) {
  const t = makeText(p);
  const { settings, update, vehicle } = useSettings();
  const allBrands = useMemo(() => brands(), []);
  const [brand, setBrand] = useState<string>(vehicle.brand);
  const [query, setQuery] = useState('');

  const models = useMemo(() => modelsOf(brand), [brand]);

  const searchHits = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    if (q.length < 2) return null;
    return allBrands
      .flatMap((b) => modelsOf(b))
      .filter((v) =>
        `${v.brand} ${v.model}`.toLocaleLowerCase('tr').includes(q),
      )
      .slice(0, 40);
  }, [query, allBrands]);

  const pick = (v: Vehicle) => {
    update({ vehicleId: v.id });
    setBrand(v.brand);
  };

  return (
    <Sheet p={p} visible={visible} title="Aracını seç" onClose={onClose}>
      <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Marka veya model ara (ör. Ioniq, Togg, ID.4)"
          placeholderTextColor={p.textFaint}
          autoCorrect={false}
          style={{
            backgroundColor: p.surface,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: p.border,
            paddingHorizontal: space.md,
            paddingVertical: 12,
            color: p.text,
            fontSize: 15,
          }}
        />
      </View>

      <ScrollView
        style={{ maxHeight: 380 }}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {searchHits ? (
          <View style={{ gap: space.sm }}>
            {searchHits.length === 0 ? (
              <Text style={t.dim}>
                Eşleşme yok. Listede olmayan araç için “Diğer → Elle gir”i seç.
              </Text>
            ) : null}
            {searchHits.map((v) => (
              <ModelRow
                key={v.id}
                p={p}
                v={v}
                selected={v.id === settings.vehicleId}
                onPress={() => pick(v)}
              />
            ))}
          </View>
        ) : (
          <>
            <Text style={[t.label, { marginBottom: space.sm }]}>Marka</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {allBrands.map((b) => {
                const active = b === brand;
                return (
                  <Pressable
                    key={b}
                    onPress={() => setBrand(b)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 13,
                      borderRadius: radius.pill,
                      backgroundColor: active ? p.accent : p.surface,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: active ? p.accent : p.border,
                    }}
                  >
                    <Text
                      style={{
                        color: active ? p.accentText : p.text,
                        fontWeight: '600',
                        fontSize: 13.5,
                      }}
                    >
                      {b}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[t.label, { marginTop: space.lg, marginBottom: space.sm }]}>
              {brand} modelleri
            </Text>
            <View style={{ gap: space.sm }}>
              {models.map((v) => (
                <ModelRow
                  key={v.id}
                  p={p}
                  v={v}
                  selected={v.id === settings.vehicleId}
                  onPress={() => pick(v)}
                />
              ))}
            </View>
          </>
        )}

        {settings.vehicleId === 'custom' ? (
          <>
            <Divider p={p} />
            <CustomVehicleForm p={p} />
          </>
        ) : (
          <>
            <Divider p={p} />
            <OverrideForm p={p} />
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

function ModelRow({
  p,
  v,
  selected,
  onPress,
}: {
  p: Palette;
  v: Vehicle;
  selected: boolean;
  onPress: () => void;
}) {
  const t = makeText(p);
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          backgroundColor: selected ? p.surfaceAlt : p.surface,
          borderRadius: radius.md,
          borderWidth: selected ? 1.5 : StyleSheet.hairlineWidth,
          borderColor: selected ? p.accent : p.border,
          padding: space.md,
        }}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={t.h3}>
              {v.brand === 'Diğer' ? 'Listede yok — elle gir' : `${v.brand} ${v.model}`}
            </Text>
            <Text style={[t.faint, { marginTop: 3 }]}>
              {v.batteryKwh} kWh · {v.whPerKm} Wh/km · {v.maxDcKw} kW DC ·{' '}
              {v.dcConnector}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: p.text, fontSize: 17, fontWeight: '700' }}>
              {nominalRangeKm(v)}
            </Text>
            <Text style={t.faint}>km menzil</Text>
          </View>
        </Row>
      </View>
    </Pressable>
  );
}

function NumField({
  p,
  label,
  suffix,
  value,
  onCommit,
}: {
  p: Palette;
  label: string;
  suffix: string;
  value: number;
  onCommit: (n: number) => void;
}) {
  const t = makeText(p);
  const [text, setText] = useState(String(value));
  return (
    <View style={{ flex: 1 }}>
      <Text style={[t.label, { marginBottom: 5 }]}>{label}</Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: p.surface,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          paddingHorizontal: space.md,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={() => {
            const n = Number(text.replace(',', '.'));
            if (Number.isFinite(n) && n > 0) onCommit(n);
            else setText(String(value));
          }}
          keyboardType="decimal-pad"
          style={{ flex: 1, paddingVertical: 11, color: p.text, fontSize: 15 }}
        />
        <Text style={t.faint}>{suffix}</Text>
      </View>
    </View>
  );
}

function CustomVehicleForm({ p }: { p: Palette }) {
  const t = makeText(p);
  const { settings, update } = useSettings();
  const c = settings.custom;
  const set = (patch: Partial<Vehicle>) =>
    update({ custom: { ...c, ...patch, id: 'custom' } });

  return (
    <View style={{ gap: space.md }}>
      <Text style={t.h3}>Araç bilgilerini gir</Text>
      <Text style={t.dim}>
        Bu değerler menzil ve şarj süresi hesabında kullanılır. Batarya için
        kullanılabilir (net) kapasiteyi yaz.
      </Text>
      <Row gap={space.md}>
        <NumField
          p={p}
          label="Batarya"
          suffix="kWh"
          value={c.batteryKwh}
          onCommit={(n) => set({ batteryKwh: n })}
        />
        <NumField
          p={p}
          label="Tüketim"
          suffix="Wh/km"
          value={c.whPerKm}
          onCommit={(n) => set({ whPerKm: n })}
        />
      </Row>
      <Row gap={space.md}>
        <NumField
          p={p}
          label="DC tepe güç"
          suffix="kW"
          value={c.maxDcKw}
          onCommit={(n) => set({ maxDcKw: n })}
        />
        <NumField
          p={p}
          label="AC güç"
          suffix="kW"
          value={c.maxAcKw}
          onCommit={(n) => set({ maxAcKw: n })}
        />
      </Row>
      <View>
        <Text style={[t.label, { marginBottom: space.sm }]}>DC konnektör</Text>
        <Row gap={space.sm}>
          {(['CCS2', 'CHAdeMO', 'TESLA'] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => set({ dcConnector: k })}
              style={{
                flex: 1,
                paddingVertical: 11,
                borderRadius: radius.md,
                alignItems: 'center',
                backgroundColor: c.dcConnector === k ? p.accent : p.surface,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: c.dcConnector === k ? p.accent : p.border,
              }}
            >
              <Text
                style={{
                  color: c.dcConnector === k ? p.accentText : p.text,
                  fontWeight: '700',
                  fontSize: 13,
                }}
              >
                {k}
              </Text>
            </Pressable>
          ))}
        </Row>
      </View>
    </View>
  );
}

/** Seçili aracın veritabanı değerlerini kullanıcı düzeltebilir. */
function OverrideForm({ p }: { p: Palette }) {
  const t = makeText(p);
  const { settings, update, vehicle } = useSettings();
  const ov = settings.overrides[vehicle.id] ?? {};
  const dirty = ov.batteryKwh != null || ov.whPerKm != null;

  const set = (patch: { batteryKwh?: number; whPerKm?: number }) =>
    update({
      overrides: {
        ...settings.overrides,
        [vehicle.id]: { ...ov, ...patch },
      },
    });

  const clear = () => {
    const next = { ...settings.overrides };
    delete next[vehicle.id];
    update({ overrides: next });
  };

  return (
    <View style={{ gap: space.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={t.h3}>Değerleri düzelt</Text>
        {dirty ? <Badge p={p} label="düzeltilmiş" color={p.warn} /> : null}
      </Row>
      <Text style={t.dim}>
        Veritabanı değerleri yaklaşıktır. Aracının gerçek tüketimini biliyorsan
        buraya yaz — plan hemen daha isabetli olur.
      </Text>
      <Row gap={space.md}>
        <NumField
          key={`bat-${vehicle.id}-${ov.batteryKwh ?? 'd'}`}
          p={p}
          label="Batarya"
          suffix="kWh"
          value={vehicle.batteryKwh}
          onCommit={(n) => set({ batteryKwh: n })}
        />
        <NumField
          key={`con-${vehicle.id}-${ov.whPerKm ?? 'd'}`}
          p={p}
          label="Tüketim"
          suffix="Wh/km"
          value={vehicle.whPerKm}
          onCommit={(n) => set({ whPerKm: n })}
        />
      </Row>
      {dirty ? (
        <Button p={p} kind="ghost" title="Fabrika değerlerine dön" onPress={clear} />
      ) : null}
      <Card p={p} style={{ padding: space.md }}>
        <Text style={t.faint}>
          {vehicle.brand} {vehicle.model} · {nominalRangeKm(vehicle)} km nominal
          menzil · {vehicle.dcConnector} · {vehicle.maxDcKw} kW DC /{' '}
          {vehicle.maxAcKw} kW AC
        </Text>
      </Card>
    </View>
  );
}
