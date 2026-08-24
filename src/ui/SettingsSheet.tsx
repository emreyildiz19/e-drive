import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { DEFAULT_SETTINGS, useSettings } from '../store/settings';
import { radius, space, type Palette } from '../theme';
import { tempFactor } from '../lib/energy';
import { Button, Card, Divider, Row, Segmented, Slider, makeText } from './Primitives';
import { Sheet } from './Sheet';

function Field({
  p,
  label,
  hint,
  children,
}: {
  p: Palette;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const t = makeText(p);
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={[t.label, { marginBottom: 6 }]}>{label}</Text>
      {children}
      {hint ? <Text style={[t.faint, { marginTop: 4 }]}>{hint}</Text> : null}
    </View>
  );
}

export function SettingsSheet({
  p,
  visible,
  onClose,
}: {
  p: Palette;
  visible: boolean;
  onClose: () => void;
}) {
  const t = makeText(p);
  const { settings, update, reset } = useSettings();
  const tf = tempFactor(settings.tempC);

  return (
    <Sheet p={p} visible={visible} title="Ayarlar" onClose={onClose}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.xl }}
        keyboardShouldPersistTaps="handled"
      >
        <Field
          p={p}
          label={`Dış sıcaklık — ${settings.tempC} °C`}
          hint={`Tüketim ${tf >= 1 ? '+' : ''}${Math.round((tf - 1) * 100)}% olarak hesaplanıyor. Soğukta menzil ciddi düşer.`}
        >
          <Slider
            p={p}
            value={settings.tempC}
            min={-25}
            max={45}
            step={1}
            onChange={(v) => update({ tempC: v })}
            color={settings.tempC <= 5 ? p.slow : settings.tempC >= 32 ? p.warn : p.accent}
          />
        </Field>

        <Field p={p} label="Sürüş tarzı" hint="Otoyol hızı ve pedal kullanımı tüketimi doğrudan etkiler.">
          <Segmented
            p={p}
            value={settings.style}
            onChange={(v) => update({ style: v })}
            options={[
              { value: 'eco', label: 'Ekonomik' },
              { value: 'normal', label: 'Normal' },
              { value: 'sport', label: 'Hızlı' },
            ]}
          />
        </Field>

        <Divider p={p} />

        <Field
          p={p}
          label={`Varışta kalsın — %${settings.arrivalBufferPct}`}
          hint="Güvenlik payı. Rampa, rüzgâr ve trafik sürprizleri için bırakılan tampon."
        >
          <Slider
            p={p}
            value={settings.arrivalBufferPct}
            min={0}
            max={35}
            step={1}
            onChange={(v) => update({ arrivalBufferPct: v })}
          />
        </Field>

        <Field
          p={p}
          label={`Duraklarda şarj üst sınırı — %${settings.maxChargePct}`}
          hint="%80 üstünde şarj hızı belirgin düşer; yolculukta %80'de kesmek genelde daha hızlıdır."
        >
          <Slider
            p={p}
            value={settings.maxChargePct}
            min={50}
            max={100}
            step={5}
            onChange={(v) => update({ maxChargePct: v })}
          />
        </Field>

        <Field
          p={p}
          label={`Rotadan sapma toleransı — ${settings.maxDetourKm} km`}
          hint="Bu mesafeden uzaktaki istasyonlar hiç değerlendirilmez."
        >
          <Slider
            p={p}
            value={settings.maxDetourKm}
            min={0.5}
            max={25}
            step={0.5}
            onChange={(v) => update({ maxDetourKm: v })}
          />
        </Field>

        <Field
          p={p}
          label={`Minimum istasyon gücü — ${settings.minStationKw} kW`}
          hint="Durak olarak sadece bu gücün üstündeki istasyonlar seçilir. Yükseltmek molaları kısaltır ama seçenek azaltır."
        >
          <Slider
            p={p}
            value={settings.minStationKw}
            min={0}
            max={200}
            step={5}
            onChange={(v) => update({ minStationKw: v })}
          />
        </Field>

        <Row style={{ justifyContent: 'space-between', marginBottom: space.lg }}>
          <View style={{ flex: 1, paddingRight: space.md }}>
            <Text style={t.h3}>Haritada sadece hızlı şarj</Text>
            <Text style={t.faint}>
              Kapatırsan AC (Type 2) istasyonları da haritada görünür.
            </Text>
          </View>
          <Switch
            value={settings.onlyDc}
            onValueChange={(v) => update({ onlyDc: v })}
            trackColor={{ true: p.accent, false: p.border }}
          />
        </Row>

        <Divider p={p} />

        <Text style={[t.h3, { marginBottom: 6 }]}>API anahtarları (isteğe bağlı)</Text>
        <Text style={[t.dim, { marginBottom: space.lg }]}>
          Uygulama anahtarsız çalışır. Bu iki servis ücretsizdir ve kredi kartı
          istemez; eklersen rota ve şarj verisi daha güvenilir olur.
        </Text>

        <Field
          p={p}
          label="OpenRouteService anahtarı"
          hint="Daha stabil rota. openrouteservice.org üzerinden ücretsiz üyelik, günlük 2000 istek."
        >
          <KeyInput
            p={p}
            value={settings.orsKey}
            onChange={(v) => update({ orsKey: v })}
            placeholder="eyJ... ile başlayan anahtar"
          />
          <Pressable onPress={() => Linking.openURL('https://openrouteservice.org/dev/#/signup')}>
            <Text style={{ color: p.slow, fontSize: 12.5, marginTop: 6 }}>
              Ücretsiz anahtar al →
            </Text>
          </Pressable>
        </Field>

        <Field
          p={p}
          label="Open Charge Map anahtarı"
          hint="İstasyonların gücü ve konnektörleri daha eksiksiz gelir."
        >
          <KeyInput
            p={p}
            value={settings.ocmKey}
            onChange={(v) => update({ ocmKey: v })}
            placeholder="OCM API anahtarı"
          />
          <Pressable onPress={() => Linking.openURL('https://openchargemap.org/site/profile/applications')}>
            <Text style={{ color: p.slow, fontSize: 12.5, marginTop: 6 }}>
              Ücretsiz anahtar al →
            </Text>
          </Pressable>
        </Field>

        <Divider p={p} />

        <Card p={p} style={{ marginBottom: space.lg }}>
          <Text style={t.h3}>Veri kaynakları</Text>
          <Text style={[t.dim, { marginTop: 6 }]}>
            Harita: Apple Maps (iOS). Rota: OSRM / OpenRouteService. Şarj
            istasyonları: OpenStreetMap katkıcıları (ODbL) ve Open Charge Map.
            Adres arama: Photon / OpenStreetMap.
          </Text>
          <Text style={[t.faint, { marginTop: space.sm }]}>
            İstasyon bilgileri topluluk verisidir; güç ve doluluk anlık
            değişebilir. Yola çıkmadan kritik durağı işletmecinin
            uygulamasından da doğrula.
          </Text>
        </Card>

        <Button
          p={p}
          kind="ghost"
          title="Tüm ayarları sıfırla"
          onPress={reset}
        />
        <Text style={[t.faint, { marginTop: space.sm, textAlign: 'center' }]}>
          Varsayılan: {DEFAULT_SETTINGS.tempC} °C · %
          {DEFAULT_SETTINGS.arrivalBufferPct} tampon · %
          {DEFAULT_SETTINGS.maxChargePct} üst sınır
        </Text>
      </ScrollView>
    </Sheet>
  );
}

function KeyInput({
  p,
  value,
  onChange,
  placeholder,
}: {
  p: Palette;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={p.textFaint}
      autoCapitalize="none"
      autoCorrect={false}
      style={{
        backgroundColor: p.surface,
        borderRadius: radius.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.border,
        paddingHorizontal: space.md,
        paddingVertical: 11,
        color: p.text,
        fontSize: 14,
      }}
    />
  );
}
