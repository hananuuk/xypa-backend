import React from 'react';
import { tr } from '../i18n';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Text } from './Text';
import { colors, font } from './tokens';

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <TextInput accessibilityLabel={tr(label)} placeholderTextColor={colors.muted} {...props} style={[s.input, props.style]} />
    </View>
  );
}

/** Selectable pill: used for envelope, account and group pickers. */
export function Chip({ label, selected, onPress, color, accent }: { label: string; selected?: boolean; onPress: () => void; color?: string; accent?: boolean }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected: !!selected }} accessibilityLabel={tr(label)} onPress={onPress}
      style={[s.chip, selected && (accent ? s.chipAccent : s.chipOn)]}>
      {color ? <View style={[s.dot, { backgroundColor: color }]} /> : null}
      <Text style={[s.chipText, selected && { color: colors.white }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={s.seg} accessibilityRole="radiogroup">
      {options.map((o) => (
        <Pressable key={o.value} accessibilityRole="radio" accessibilityState={{ selected: o.value === value }} onPress={() => onChange(o.value)} style={[s.segBtn, o.value === value && s.segOn]}>
          <Text style={[s.segText, o.value === value && { color: colors.white }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  field: { marginTop: 14 },
  label: { fontFamily: font.regular, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted, marginBottom: 6 },
  input: { fontFamily: font.regular, fontSize: 17, color: colors.ink, backgroundColor: colors.inner, borderRadius: 16, minHeight: 52, paddingHorizontal: 16, fontVariant: ['tabular-nums'] },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.chip },
  chipOn: { backgroundColor: colors.ink },
  chipAccent: { backgroundColor: colors.accent },
  chipText: { fontFamily: font.regular, fontSize: 14, color: colors.ink },
  dot: { width: 9, height: 9, borderRadius: 5 },
  seg: { flexDirection: 'row', backgroundColor: colors.chip, borderRadius: 999, padding: 3 },
  segBtn: { flex: 1, minHeight: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.ink },
  segText: { fontFamily: font.medium, fontSize: 14, color: colors.ink },
});
