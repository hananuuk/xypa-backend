import React from 'react';
import { tr } from '../i18n';
import { Pressable, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors, font, MIN_TARGET, radius, space } from './tokens';

/** White rounded block (spec §2.3). */
export function Block({ children, style, padding = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padding?: boolean }) {
  return <View style={[s.block, padding && s.blockPad, style]}>{children}</View>;
}

/** Grey card inside a block. */
export function InnerCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.inner, style]}>{children}</View>;
}

/** White pill header bar: title/month on the left, icon buttons or pills on the right. */
export function PillBar({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={s.pillBar}>
      <View style={s.pillLeft}>{left}</View>
      {right ? <View style={s.pillRight}>{right}</View> : null}
    </View>
  );
}

/** Round icon button inside a white block: visual 40px, hit area at least 44px. */
export function IconButton({ children, label, onPress, style }: { children: React.ReactNode; label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={tr(label)} onPress={onPress} hitSlop={6} style={({ pressed }) => [s.iconBtn, pressed && s.pressed, style]}>
      {children}
    </Pressable>
  );
}

type ButtonVariant = 'primary' | 'accent' | 'outline' | 'chip';

/** Primary is black with white text, fully rounded (spec §2.3). */
export function Button({ title, onPress, variant = 'primary', full, small, disabled, style, textStyle, accessibilityLabel }: {
  title: string; onPress: () => void; variant?: ButtonVariant; full?: boolean; small?: boolean; disabled?: boolean;
  style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>; accessibilityLabel?: string;
}) {
  const bg = variant === 'primary' ? colors.ink : variant === 'accent' ? colors.accent : variant === 'chip' ? colors.chip : 'transparent';
  const fg = variant === 'primary' || variant === 'accent' ? colors.white : variant === 'outline' ? colors.accent : colors.ink;
  const border = variant === 'outline' ? colors.accent : 'transparent';
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? title} accessibilityState={{ disabled: !!disabled }}
      disabled={disabled} onPress={onPress} hitSlop={small ? { top: 6, bottom: 6, left: 6, right: 6 } : undefined}
      style={({ pressed }) => [
        s.btn, full ? s.btnFull : small ? s.btnSmall : s.btnMid,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === 'outline' ? 1.5 : 0 },
        disabled && { opacity: 0.4 }, pressed && s.pressed, style,
      ]}>
      <Text style={[{ fontFamily: font.medium, fontSize: small ? 14 : 16, color: fg }, textStyle]}>{title}</Text>
    </Pressable>
  );
}

/** Section label: 12px uppercase with +0.6 tracking, optionally with a total on the right. */
export function SectionLabel({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionText}>{title}</Text>
      {right}
    </View>
  );
}

const s = StyleSheet.create({
  block: { backgroundColor: colors.block, borderRadius: radius.block },
  blockPad: { paddingVertical: space.blockV, paddingHorizontal: space.blockH },
  inner: { backgroundColor: colors.inner, borderRadius: radius.inner, padding: 13 },
  pillBar: { minHeight: 54, paddingHorizontal: 8, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pillLeft: { flexShrink: 1 },
  pillRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 40, height: 40, minWidth: MIN_TARGET - 4, borderRadius: 20, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  btn: { alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  btnFull: { height: 56, alignSelf: 'stretch' },
  btnMid: { height: 48, paddingHorizontal: 22, minWidth: MIN_TARGET },
  btnSmall: { height: 36, paddingHorizontal: 14, minWidth: MIN_TARGET },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, paddingTop: 14, paddingBottom: 8 },
  sectionText: { fontFamily: font.regular, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted },
});
