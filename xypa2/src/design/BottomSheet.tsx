import React, { useEffect, useRef } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { colors, font, radius } from './tokens';
import { t } from '../i18n/en';

/**
 * Bottom sheet: grab handle, × to close, closes on scrim tap and on the system back gesture.
 * Content scrolls inside the sheet and the sheet lifts above the keyboard instead of sliding off screen.
 */
export function BottomSheet({ visible, title, onClose, children }: { visible: boolean; title?: string; onClose: () => void; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(40)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    y.setValue(40); fade.setValue(0);
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [visible, y, fade]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.fill}>
        <Animated.View style={[s.scrim, { opacity: fade }]}>
          <Pressable style={s.fill} accessibilityLabel={t.common.close} onPress={onClose} />
        </Animated.View>
        <View style={s.bottom} pointerEvents="box-none">
          <Animated.View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8, transform: [{ translateY: y }] }]} accessibilityViewIsModal>
            <View style={s.handle} />
            <View style={s.head}>
              <Text style={s.title} accessibilityRole="header">{title ?? ''}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t.common.close} onPress={onClose} hitSlop={8} style={s.x}>
                <Icon name="close" size={20} />
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(18,18,18,0.4)' },
  bottom: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.block, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: 18, paddingTop: 8, maxHeight: '88%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line2, marginBottom: 6 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48 },
  title: { fontFamily: font.medium, fontSize: 20, color: colors.ink, flexShrink: 1 },
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 },
});
