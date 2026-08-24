import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { searchPlaces } from '../lib/api/geocode';
import { humanError } from '../lib/api/http';
import { haversineKm, formatKm } from '../lib/geo';
import { radius, space, type Palette } from '../theme';
import { makeText } from './Primitives';
import { Sheet } from './Sheet';
import type { LatLng, Place } from '../types';

/**
 * Yer arama paneli. Yazarken 350 ms bekleyip arar, eski istekleri iptal eder
 * ki hızlı yazarken sonuçlar birbirine karışmasın.
 */
export function SearchSheet({
  p,
  visible,
  title,
  near,
  onClose,
  onPick,
  onUseCurrent,
}: {
  p: Palette;
  visible: boolean;
  title: string;
  near?: LatLng | null;
  onClose: () => void;
  onPick: (place: Place) => void;
  onUseCurrent?: () => void;
}) {
  const t = makeText(p);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setError(null);
    }
  }, [visible]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    const timer = setTimeout(() => {
      searchPlaces(q, near ?? undefined)
        .then((r) => {
          if (reqId.current !== id) return;
          setResults(r);
          setError(r.length === 0 ? 'Sonuç bulunamadı.' : null);
        })
        .catch((e) => {
          if (reqId.current !== id) return;
          setError(humanError(e));
          setResults([]);
        })
        .finally(() => {
          if (reqId.current === id) setLoading(false);
        });
    }, 350);
    return () => clearTimeout(timer);
  }, [query, near]);

  return (
    <Sheet p={p} visible={visible} title={title} onClose={onClose}>
      <View style={{ paddingHorizontal: space.lg }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
            backgroundColor: p.surface,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: p.border,
            paddingHorizontal: space.md,
          }}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Şehir, ilçe, adres veya yer adı"
            placeholderTextColor={p.textFaint}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            style={{ flex: 1, paddingVertical: 13, color: p.text, fontSize: 16 }}
          />
          {loading ? <ActivityIndicator size="small" color={p.textDim} /> : null}
        </View>

        {onUseCurrent ? (
          <Pressable
            onPress={onUseCurrent}
            style={({ pressed }) => ({
              marginTop: space.md,
              padding: space.md,
              borderRadius: radius.md,
              backgroundColor: pressed ? p.surfaceAlt : p.surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: p.border,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
            })}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: radius.pill,
                backgroundColor: p.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: p.accentText, fontSize: 15 }}>◎</Text>
            </View>
            <Text style={t.h3}>Bulunduğum konumu kullan</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={{ maxHeight: 400, marginTop: space.md }}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space.lg }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Text style={[t.dim, { paddingVertical: space.md }]}>{error}</Text> : null}
        {results.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => onPick(r)}
            style={({ pressed }) => ({
              paddingVertical: space.md,
              opacity: pressed ? 0.6 : 1,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderColor: p.border,
            })}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space.md }}>
              <View style={{ flex: 1 }}>
                <Text style={t.h3} numberOfLines={1}>
                  {r.label}
                </Text>
                {r.detail ? (
                  <Text style={[t.faint, { marginTop: 2 }]} numberOfLines={1}>
                    {r.detail}
                  </Text>
                ) : null}
              </View>
              {near ? (
                <Text style={t.faint}>
                  {formatKm(
                    haversineKm(near, { latitude: r.latitude, longitude: r.longitude }),
                  )}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Sheet>
  );
}
