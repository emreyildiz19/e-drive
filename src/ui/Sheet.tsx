import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, space, type Palette } from '../theme';

/**
 * Alttan açılan tam boy panel. iPhone'da çentik ve alt çubuk için güvenli
 * alan boşlukları uygulanır.
 */
export function Sheet({
  p,
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  p: Palette;
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View
          style={{
            backgroundColor: p.bg,
            borderTopLeftRadius: 26,
            borderTopRightRadius: 26,
            maxHeight: '88%',
            paddingBottom: Math.max(insets.bottom, space.md),
            borderTopWidth: StyleSheet.hairlineWidth,
            borderColor: p.border,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: space.lg,
              paddingTop: space.lg,
              paddingBottom: space.md,
            }}
          >
            <Text style={{ color: p.text, fontSize: 20, fontWeight: '700' }}>
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={{
                width: 32,
                height: 32,
                borderRadius: radius.pill,
                backgroundColor: p.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: p.textDim, fontSize: 17, fontWeight: '700' }}>
                ✕
              </Text>
            </Pressable>
          </View>
          {children}
          {footer ? (
            <View
              style={{
                paddingHorizontal: space.lg,
                paddingTop: space.md,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderColor: p.border,
              }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
