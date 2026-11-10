import React, { useEffect, useRef } from 'react';
import { tr } from '../../i18n';
import { Animated, Image, ImageSourcePropType, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { Text } from '../../design/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Icon } from '../../design/Icon';
import { colors, font } from '../../design/tokens';
import { formatMoney, parseMoney } from '../../logic/money';

export const ob = { page: '#FAF8F4', ink: '#1C1915', pink: '#F3BAB2', navy: '#1B2A8A' };
const FLOW_BG = require('../../../assets/flow-bg.jpg');

/** White page with the blue ribbon (money flowing), a white fade at the top so titles stay readable. */
export function Backdrop({ soft }: { soft?: boolean }) {
  const win = useWindowDimensions();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF' }]}>
      <Image source={FLOW_BG} resizeMode="cover" accessible={false} style={{ position: 'absolute', top: 0, left: 0, width: win.width, height: win.height, opacity: soft ? 0.5 : 1 }} />
      <Svg width={win.width} height={400} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          <LinearGradient id="bdfade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.96" />
            <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width={win.width} height={400} fill="url(#bdfade)" />
      </Svg>
    </View>
  );
}

/** Full-screen page. With no image it gets the ribbon backdrop. */
export function Poster({ image, children }: { image?: ImageSourcePropType; children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const win = useWindowDimensions();
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 16) + 8, paddingHorizontal: 20 }}>
      {image ? <Image source={image} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, width: win.width, height: win.height }} accessible={false} /> : <Backdrop />}
      {children}
    </View>
  );
}

/** Pops up from below when it first appears. */
export function PopIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: object }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(t, { toValue: 1, delay, useNativeDriver: true, speed: 16, bounciness: 8 }).start(() => t.setValue(1)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={[style, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}>{children}</Animated.View>
  );
}

export function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={tr(label)} accessibilityState={{ checked: value }} onPress={() => onChange(!value)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      style={[sw.track, { backgroundColor: value ? ob.navy : '#C9C5BD' }]}>
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

export const TOTAL_STEPS = 8;

/** Back button and the segmented progress bar. */
export function StepHeader({ step, onBack }: { step: number; onBack: () => void }) {
  return (
    <View style={sf.head}>
      <Pressable accessibilityRole="button" accessibilityLabel={tr('Back')} onPress={onBack} style={sf.back}><Icon name="chevronLeft" size={20} /></Pressable>
      {step > 0 ? (<>
        <View style={sf.segs} accessible accessibilityLabel={tr('Step {0} of {1}', step, TOTAL_STEPS)}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => <View key={i} style={[sf.seg, { backgroundColor: i < step ? ob.navy : 'rgba(27,42,138,0.15)' }]} />)}
        </View>
        <Text style={sf.count}>{`${step}/${TOTAL_STEPS}`}</Text>
      </>) : null}
    </View>
  );
}

/** Step layout: back button, progress, title, a frosted card with the content, pinned footer. */
export function StepFrame({ step, title, subtitle, onBack, children, footer }: { step: number; title: string; subtitle?: string; onBack: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', paddingTop: insets.top + 8 }}>
      <Backdrop soft />
      <StepHeader step={step} onBack={onBack} />
      <ScrollView contentContainerStyle={sf.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={sf.title} accessibilityRole="header">{title}</Text>
        {subtitle ? <Text style={sf.sub}>{subtitle}</Text> : null}
        <View style={sf.glass}>{children}</View>
      </ScrollView>
      <View style={[sf.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>{footer}</View>
    </View>
  );
}
const sf = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 6 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  segs: { flex: 1, flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
  count: { fontFamily: font.medium, fontSize: 14, color: colors.ink2 },
  body: { paddingHorizontal: 20, paddingBottom: 24 },
  title: { fontFamily: font.medium, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: ob.ink, marginTop: 14 },
  sub: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: ob.ink, opacity: 0.72, marginTop: 10, marginBottom: 14 },
  glass: { backgroundColor: 'rgba(255,255,255,0.84)', borderRadius: 28, paddingHorizontal: 18, paddingTop: 2, paddingBottom: 18, borderWidth: 1, borderColor: 'rgba(27,42,138,0.08)' },
  footer: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
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
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: 'rgba(27,42,138,0.1)' },
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderBottomWidth: 1.5, borderBottomColor: ob.navy, paddingBottom: 8, marginTop: 20 },
  t: { fontFamily: font.medium, fontSize: 12, letterSpacing: 1.4, color: ob.navy },
  r: { fontFamily: font.regular, fontSize: 13, color: colors.ink2 },
});

export const DashedAdd = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={tr(label)} onPress={onPress} style={da.btn}><Text style={da.t}>{label}</Text></Pressable>
);
const da = StyleSheet.create({
  btn: { alignSelf: 'flex-start', minHeight: 48, borderRadius: 999, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(27,42,138,0.4)', paddingHorizontal: 20, justifyContent: 'center', marginTop: 16 },
  t: { fontFamily: font.medium, fontSize: 15, color: ob.navy },
});

