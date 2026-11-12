import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { tr } from '../../i18n';
import { Text } from '../../design/Text';
import { colors, font } from '../../design/tokens';
import { ob } from './ui';

/** A bank statement slides in and xypa reads it row by row: a soft scan line passes, each payment gets ticked, then the count pops up. */
const ROWS = [
  { name: 'Nomin Supermarket', amount: '−48,600₮', income: false },
  { name: 'Tom N Toms Coffee', amount: '−7,500₮', income: false },
  { name: 'Shell', amount: '−32,000₮', income: false },
  { name: 'Salary', amount: '+1,200,000₮', income: true },
];
const ROW_H = 46;
const HEAD_H = 52;
const PAD = 14;
const SCAN_FROM = 1100;
const SCAN_STEP = 520;
const LOOP = 6200;
const HOLD = 4200; // the frame shown when Reduce Motion is on
const GREEN = '#1B8A5A';
const iv = (t: Animated.Value, input: number[], output: number[]) => t.interpolate({ inputRange: input, outputRange: output, extrapolate: 'clamp' });

export function StatementAnimation() {
  const t = useRef(new Animated.Value(0)).current;
  const [reduce, setReduce] = useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {}); }, []);
  useEffect(() => {
    if (reduce) { t.stopAnimation(); t.setValue(HOLD); return; }
    t.setValue(0);
    const loop = Animated.loop(Animated.timing(t, { toValue: LOOP, duration: LOOP, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [reduce, t]);

  const last = SCAN_FROM + (ROWS.length - 1) * SCAN_STEP;
  const rowsH = ROWS.length * ROW_H;
  const chipAt = last + 500;
  return (
    <View style={a.wrap} accessible accessibilityLabel={tr('A bank statement being read, payment by payment')}>
      <Animated.View importantForAccessibility="no-hide-descendants" style={[a.card, {
        opacity: iv(t, [0, 200, 520, 4900, 5300], [0, 0, 1, 1, 0]),
        transform: [{ translateY: iv(t, [0, 200, 620, 800], [46, 46, -6, 0]) }, { scale: iv(t, [0, 200, 800], [0.95, 0.95, 1]) }],
      }]}>
        <View style={a.head}>
          <View style={a.doc}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M7 3h7l5 5v13H7z" /><Path d="M14 3v5h5M10 13h6M10 17h6" /></Svg>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={a.title}>Statement</Text>
            <Text style={a.sub}>Last 3 months</Text>
          </View>
          <View style={a.tag}><Text style={a.tagT}>PDF</Text></View>
        </View>

        <View style={{ height: rowsH }}>
          {ROWS.map((r, i) => {
            const p = SCAN_FROM + i * SCAN_STEP;
            return (
              <View key={r.name} style={a.row}>
                <Animated.View style={[StyleSheet.absoluteFill, a.hl, { opacity: iv(t, [0, p - 160, p + 40], [0, 0, 1]) }]} />
                <Text style={a.name} numberOfLines={1}>{r.name}</Text>
                <Text style={[a.amt, r.income && { color: GREEN }]}>{r.amount}</Text>
                <Animated.View style={[a.tick, { transform: [{ scale: iv(t, [0, p, p + 160, p + 300], [0, 0, 1.25, 1]) }] }]}>
                  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round"><Path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>
                </Animated.View>
              </View>
            );
          })}
          <Animated.View pointerEvents="none" style={[a.scan, {
            opacity: iv(t, [0, SCAN_FROM - 200, SCAN_FROM - 60, last + 120, last + 320], [0, 0, 1, 1, 0]),
            transform: [{ translateY: iv(t, [0, SCAN_FROM - 160, last + 40], [-8, -8, rowsH - 38]) }],
          }]}>
            <Svg width="100%" height={46}>
              <Defs><LinearGradient id="sc" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={ob.navy} stopOpacity="0" /><Stop offset="0.85" stopColor={ob.navy} stopOpacity="0.22" /><Stop offset="1" stopColor={ob.navy} stopOpacity="0.55" /></LinearGradient></Defs>
              <Rect width="100%" height={46} fill="url(#sc)" />
            </Svg>
          </Animated.View>
        </View>
      </Animated.View>

      <Animated.View importantForAccessibility="no-hide-descendants" style={[a.chip, {
        opacity: iv(t, [0, chipAt, chipAt + 160, 4900, 5300], [0, 0, 1, 1, 0]),
        transform: [{ scale: iv(t, [0, chipAt, chipAt + 260, chipAt + 420], [0, 0, 1.12, 1]) }],
      }]}>
        <Text style={a.chipT}>{tr('{0} transactions found', 120)}</Text>
      </Animated.View>
    </View>
  );
}

const a = StyleSheet.create({
  wrap: { paddingTop: 8, paddingBottom: 26, alignItems: 'center' },
  card: {
    alignSelf: 'stretch', padding: PAD, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.96)', borderWidth: 1, borderColor: 'rgba(27,42,138,0.08)',
    shadowColor: ob.navy, shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, overflow: 'hidden',
  },
  head: { height: HEAD_H, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(27,42,138,0.1)', marginBottom: 4 },
  doc: { width: 38, height: 38, borderRadius: 12, backgroundColor: ob.navy, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.bold, fontSize: 15, lineHeight: 19, color: ob.ink },
  sub: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: colors.ink2 },
  tag: { paddingHorizontal: 9, height: 24, borderRadius: 12, backgroundColor: 'rgba(27,42,138,0.1)', justifyContent: 'center' },
  tagT: { fontFamily: font.bold, fontSize: 11, color: ob.navy },
  row: { height: ROW_H, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, marginHorizontal: -6 },
  hl: { borderRadius: 12, backgroundColor: 'rgba(27,42,138,0.07)' },
  name: { flex: 1, fontFamily: font.regular, fontSize: 15, color: ob.ink },
  amt: { fontFamily: font.bold, fontSize: 15, color: ob.ink, fontVariant: ['tabular-nums'] },
  tick: { width: 20, height: 20, borderRadius: 10, backgroundColor: ob.navy, alignItems: 'center', justifyContent: 'center' },
  scan: { position: 'absolute', left: -PAD, right: -PAD, top: 0 },
  chip: { position: 'absolute', bottom: 0, height: 40, paddingHorizontal: 18, borderRadius: 20, backgroundColor: ob.navy, justifyContent: 'center', shadowColor: ob.navy, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  chipT: { fontFamily: font.bold, fontSize: 15, color: colors.white },
});
