import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { radius, space, type Palette } from '../theme';

// ── Metin ──────────────────────────────────────────────────────────

type TxtProps = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

export function T({ children, style, numberOfLines }: TxtProps) {
  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function makeText(p: Palette) {
  return StyleSheet.create({
    h1: { color: p.text, fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
    h2: { color: p.text, fontSize: 19, fontWeight: '700', letterSpacing: -0.3 },
    h3: { color: p.text, fontSize: 15, fontWeight: '600' },
    body: { color: p.text, fontSize: 14, lineHeight: 20 },
    dim: { color: p.textDim, fontSize: 13, lineHeight: 19 },
    faint: { color: p.textFaint, fontSize: 12, lineHeight: 17 },
    label: {
      color: p.textDim,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    num: { color: p.text, fontSize: 22, fontWeight: '700' },
  });
}

// ── Kart ───────────────────────────────────────────────────────────

export function Card({
  p,
  children,
  style,
}: {
  p: Palette;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: p.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          padding: space.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ── Düğme ──────────────────────────────────────────────────────────

export function Button({
  p,
  title,
  onPress,
  kind = 'primary',
  disabled,
  loading,
  style,
}: {
  p: Palette;
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    kind === 'primary' ? p.accent : kind === 'danger' ? p.danger : 'transparent';
  const fg =
    kind === 'primary' ? p.accentText : kind === 'danger' ? '#fff' : p.text;
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          opacity: off ? 0.45 : pressed ? 0.82 : 1,
          borderRadius: radius.md,
          paddingVertical: 14,
          paddingHorizontal: space.lg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: space.sm,
          borderWidth: kind === 'ghost' ? StyleSheet.hairlineWidth : 0,
          borderColor: p.border,
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 15, fontWeight: '700' }}>{title}</Text>
    </Pressable>
  );
}

// ── Etiket / çip ───────────────────────────────────────────────────

export function Chip({
  p,
  label,
  onPress,
  active,
  color,
  style,
}: {
  p: Palette;
  label: string;
  onPress?: () => void;
  active?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const tint = color ?? p.accent;
  const body = (
    <View
      style={[
        {
          paddingVertical: 6,
          paddingHorizontal: 11,
          borderRadius: radius.pill,
          backgroundColor: active ? tint : p.surfaceAlt,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: active ? tint : p.border,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: active ? p.accentText : p.textDim,
          fontSize: 12.5,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {body}
    </Pressable>
  );
}

/** Renkli nokta + metin: güç sınıfı, kaynak vb. göstermek için. */
export function Badge({
  p,
  label,
  color,
}: {
  p: Palette;
  label: string;
  color: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: color,
        }}
      />
      <Text style={{ color: p.textDim, fontSize: 12, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

// ── Kaydırıcı (harici paket kullanmadan) ───────────────────────────

export function Slider({
  p,
  value,
  min,
  max,
  step = 1,
  onChange,
  color,
}: {
  p: Palette;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  const [width, setWidth] = useState(1);
  const widthRef = useRef(1);
  const tint = color ?? p.accent;

  const emit = (x: number) => {
    const w = widthRef.current;
    const ratio = Math.max(0, Math.min(1, x / Math.max(w, 1)));
    const raw = min + ratio * (max - min);
    const snapped = Math.round(raw / step) * step;
    // Kayan nokta artıklarını temizle (0.30000000000000004 gibi).
    const clean = Number(snapped.toFixed(4));
    onChange(Math.max(min, Math.min(max, clean)));
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => emit(e.nativeEvent.locationX),
        onPanResponderMove: (e) => emit(e.nativeEvent.locationX),
      }),
    // emit, ref üzerinden güncel genişliği okur; bağımlılık gerekmez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [min, max, step, onChange],
  );

  const pct = Math.max(0, Math.min(1, (value - min) / Math.max(max - min, 1e-6)));

  return (
    <View
      {...pan.panHandlers}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        widthRef.current = w;
        setWidth(w);
      }}
      // Dokunma alanını parmak için büyüt.
      style={{ height: 40, justifyContent: 'center' }}
    >
      <View
        pointerEvents="none"
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: p.surfaceAlt,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: pct * width,
            height: 6,
            backgroundColor: tint,
          }}
        />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: Math.max(0, pct * width - 13),
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: p.surface,
          borderWidth: 2.5,
          borderColor: tint,
        }}
      />
    </View>
  );
}

// ── Segment seçici ─────────────────────────────────────────────────

export function Segmented<V extends string>({
  p,
  options,
  value,
  onChange,
}: {
  p: Palette;
  options: { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: p.surfaceAlt,
        borderRadius: radius.md,
        padding: 3,
        gap: 3,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: radius.sm + 2,
              backgroundColor: active ? p.accent : 'transparent',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: active ? p.accentText : p.textDim,
                fontWeight: '700',
                fontSize: 13,
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Yerleşim yardımcıları ──────────────────────────────────────────

export function Row({
  children,
  gap = space.sm,
  style,
}: {
  children: React.ReactNode;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>
      {children}
    </View>
  );
}

export function Divider({ p }: { p: Palette }) {
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: p.border,
        marginVertical: space.md,
      }}
    />
  );
}

/** Büyük sayı + altında etiket. Özet şeridi için. */
export function Stat({
  p,
  value,
  label,
  color,
}: {
  p: Palette;
  value: string;
  label: string;
  color?: string;
}) {
  const t = makeText(p);
  return (
    <View style={{ flex: 1 }}>
      <Text style={[t.num, color ? { color } : null]}>{value}</Text>
      <Text style={t.label}>{label}</Text>
    </View>
  );
}
