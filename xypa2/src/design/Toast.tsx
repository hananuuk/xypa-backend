import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, font } from './tokens';
import { t } from '../i18n/en';

export type ToastData = { id: number; message: string; onUndo?: () => void };

/** Undo toast: state-changing actions show one with an Undo button. Auto-dismisses after 5s. */
export function Toast({ toast, onDismiss, bottom }: { toast: ToastData | null; onDismiss: () => void; bottom: number }) {
  const o = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!toast) return;
    o.setValue(0);
    Animated.timing(o, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [toast, o, onDismiss]);
  if (!toast) return null;
  return (
    <Animated.View accessibilityLiveRegion="polite" style={[s.toast, { bottom, opacity: o }]}>
      <Text style={s.msg}>{toast.message}</Text>
      {toast.onUndo ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t.common.undo} hitSlop={10} onPress={() => { toast.onUndo?.(); onDismiss(); }}>
          <Text style={s.undo}>{t.common.undo}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  toast: { position: 'absolute', left: 16, right: 16, backgroundColor: colors.ink, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  msg: { fontFamily: font.regular, fontSize: 14, color: colors.white, flexShrink: 1 },
  undo: { fontFamily: font.medium, fontSize: 14, color: '#F6A37F', minHeight: 44, lineHeight: 44 },
});
