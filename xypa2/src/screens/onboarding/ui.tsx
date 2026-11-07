import React from 'react';
import { tr } from '../../i18n';
import { Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../design/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Icon } from '../../design/Icon';
import { colors, font } from '../../design/tokens';
import { formatMoney, parseMoney } from '../../logic/money';

export const ob = { page: '#FAF8F4', ink: '#1C1915', pink: '#F3BAB2' };

/** Pastel poster background with two soft glows (Hello and Done). */
export function Poster({ bg = ob.pink, glowA = '#E98A80', glowB = '#E9F181', image, children }: { bg?: string; glowA?: string; glowB?: string; image?: ImageSourcePropType; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[{ flex: 1, backgroundColor: bg, paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) + 8, paddingHorizontal: 20 }]}>
      {image ? <Image source={image} resizeMode="cover" style={StyleSheet.absoluteFill} accessible={false} /> : (
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="a" cx="0%" cy="45%" rx="70%" ry="30%"><Stop offset="0" stopColor={glowA} stopOpacity="0.85" /><Stop offset="1" stopColor={glowA} stopOpacity="0" /></RadialGradient>
          <RadialGradient id="b" cx="100%" cy="92%" rx="60%" ry="25%"><Stop offset="0" stopColor={glowB} stopOpacity="0.9" /><Stop offset="1" stopColor={glowB} stopOpacity="0" /></RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#a)" />
        <Rect width="100%" height="100%" fill="url(#b)" />
      </Svg>)}
      {children}
    </View>
  );
}

export function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={tr(label)} accessibilityState={{ checked: value }} onPress={() => onChange(!value)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[sw.track, { backgroundColor: value ? ob.ink : '#C9C5BD' }]}>
      <View style={[sw.knob, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </Pressable>
  );
}
const sw = StyleSheet.create({
  track: { width: 52, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white },
});

/** Right-aligned thousands-separated amount input. Empty shows the placeholder 0. */
export function AmountInput({ value, onChange, label, width = 150 }: { value: number; onChange: (n: number) => void; label: string; width?: number }) {
  return (
    <TextInput accessibilityLabel={tr(label)} keyboardType="number-pad" value={value ? value.toLocaleString('en-US') : ''} placeholder={tr('0')} placeholderTextColor={colors.muted}
      onChangeText={(t) => onChange(parseMoney(t))} style={[a.input, { width }]} selectTextOnFocus />
  );
}
const a = StyleSheet.create({
  input: { fontFamily: font.medium, fontSize: 17, textAlign: 'right', color: ob.ink, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.line, minHeight: 48, paddingHorizontal: 16, fontVariant: ['tabular-nums'] },
});

/** Step layout: back button, 6-segment progress, title, scrolling body, pinned footer. */
export function StepFrame({ step, title, subtitle, onBack, children, footer }: { step: number; title: string; subtitle?: string; onBack: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: ob.page, paddingTop: insets.top + 8 }}>
      <View style={sf.head}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Back')} onPress={onBack} style={sf.back}><Icon name="chevronLeft" size={20} /></Pressable>
        {step > 0 ? (<>
          <View style={sf.segs} accessible accessibilityLabel={tr('Step {0} of 6', step)}>
            {[1, 2, 3, 4, 5, 6].map((i) => <View key={i} style={[sf.seg, { backgroundColor: i <= step ? ob.ink : '#DAD6CE' }]} />)}
          </View>
          <Text style={sf.count}>{step} of 6</Text>
        </>) : null}
      </View>
      <ScrollView contentContainerStyle={sf.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={sf.title} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={sf.sub}>{subtitle}</Text> : null}
        {children}
      </ScrollView>
      <View style={[sf.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>{footer}</View>
    </View>
  );
}
const sf = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 6 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  segs: { flex: 1, flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
  count: { fontFamily: font.medium, fontSize: 14, color: colors.ink2 },
  body: { paddingHorizontal: 20, paddingBottom: 24 },
  title: { fontFamily: font.medium, fontSize: 34, lineHeight: 38, letterSpacing: -1.2, color: ob.ink, marginTop: 14 },
  sub: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.ink2, marginTop: 10, marginBottom: 14 },
  footer: { paddingHorizontal: 20, paddingTop: 8, gap: 10, backgroundColor: ob.page },
});

export function CostFooter({ regular, everyday, yearly }: { regular: number; everyday: number; yearly?: number }) {
  const total = regular + everyday + (yearly ?? 0);
  return (
    <View style={cf.box} accessible accessibilityLabel={tr('Your month costs {0}', formatMoney(total))}>
      <View style={{ flex: 1 }}>
        <Text style={cf.label}>YOUR MONTH COSTS</Text>
        <Text style={cf.sub}>{tr(yearly !== undefined ? 'Regular {0} · Everyday {1} · Yearly {2}' : 'Regular {0} · Everyday {1}', formatMoney(regular), formatMoney(everyday), formatMoney(yearly ?? 0))}</Text>
      </View>
      <Text style={cf.total}>{formatMoney(total)}</Text>
    </View>
  );
}
const cf = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EEEBE5', borderRadius: 20, padding: 16 },
  label: { fontFamily: font.medium, fontSize: 12, letterSpacing: 1.4, color: ob.ink },
  sub: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.ink2, marginTop: 4 },
  total: { fontFamily: font.medium, fontSize: 22, letterSpacing: -0.6, color: ob.ink },
});

export function BigButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={tr(title)} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [bb.btn, disabled && { backgroundColor: '#CAC7C1' }, pressed && { opacity: 0.85 }]}>
      <Text style={[bb.text, disabled && { color: '#6F6B64' }]}>{title}</Text>
    </Pressable>
  );
}
const bb = StyleSheet.create({
  btn: { minHeight: 56, borderRadius: 999, backgroundColor: ob.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  text: { fontFamily: font.medium, fontSize: 17, color: colors.white },
});

export const SectionHead = ({ title, right }: { title: string; right?: string }) => (
  <View style={sh.row}><Text style={sh.t}>{title}</Text>{right ? <Text style={sh.r}>{right}</Text> : null}</View>
);
const sh = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderBottomWidth: 1.5, borderBottomColor: ob.ink, paddingBottom: 8, marginTop: 20 },
  t: { fontFamily: font.medium, fontSize: 12, letterSpacing: 1.4, color: ob.ink },
  r: { fontFamily: font.regular, fontSize: 13, color: colors.ink2 },
});

export const DashedAdd = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={tr(label)} onPress={onPress} style={da.btn}><Text style={da.t}>{label}</Text></Pressable>
);
const da = StyleSheet.create({
  btn: { alignSelf: 'flex-start', minHeight: 48, borderRadius: 999, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line2, paddingHorizontal: 20, justifyContent: 'center', marginTop: 16 },
  t: { fontFamily: font.medium, fontSize: 15, color: ob.ink },
});
