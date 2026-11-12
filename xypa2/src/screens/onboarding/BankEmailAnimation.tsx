import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, G, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { tr } from '../../i18n';
import { Text } from '../../design/Text';
import { font } from '../../design/tokens';

/**
 * "Let your bank emails do the typing": a bank notification drops in, is pressed, opens into the email,
 * the amount, shop and time grow and fly into an xypa row, and a Groceries tag pops on. Loops every 8.5 s.
 * Timeline (ms): notify 300 · press 1700 · open 2150 · read 2900 · move 4250 · done 5350 · out 7900 · loop 8500
 */
const LOOP = 8500;
const FINAL = 6000; // the "done" frame, used when paused or when reduce motion is on
const STAGE_H = 286;
const INK = '#121212';
const MUTED = '#5E5B55';
const LINE = '#E6E2DA';
const ACCENT = '#C2410C';
const PRESS = 'rgba(31,25,22,.28)';

const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
const flyEase = Easing.bezier(0.55, 0, 0.2, 1);

type V = Animated.Value;
const iv = (t: V, input: number[], output: number[], easing?: (x: number) => number) =>
  t.interpolate({ inputRange: input, outputRange: output, extrapolate: 'clamp', ...(easing ? { easing } : {}) });

const MailIcon = ({ size }: { size: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="5" width="18" height="14" rx="3" /><Path d="M3.5 7l8.5 6 8.5-6" />
  </Svg>
);

type FlyDef = { key: 'amt' | 'mer' | 'date'; text: string; delay: number; srcTop: number; dstTop: number; end: number; align: 'right' | 'left' };
const FLY: FlyDef[] = [
  { key: 'amt', text: '48,600₮', delay: 0, srcTop: 105.5, dstTop: 210, end: 15 / 16, align: 'right' },
  { key: 'mer', text: 'Nomin Supermarket', delay: 150, srcTop: 147.5, dstTop: 219, end: 14 / 16, align: 'left' },
  { key: 'date', text: '5 Nov, 12:40', delay: 300, srcTop: 189.5, dstTop: 237, end: 12 / 16, align: 'left' },
];

function Fly({ def, t, W }: { def: FlyDef; t: V; W: number }) {
  const [w, setW] = useState(0);
  const s = 4250 + def.delay;
  const x0 = W - 12 - 14 - w;
  const x1 = def.align === 'right' ? W - 12 - 12 - w * def.end : 68;
  return (
    <Animated.View pointerEvents="none" onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={{
        position: 'absolute', left: 0, top: 0, opacity: w ? iv(t, [0, 4249, 4250, 5349, 5350], [0, 0, 1, 1, 0]) : 0, transformOrigin: '0% 0%',
        transform: [
          { translateX: iv(t, [s, s + 700], [x0, x1], flyEase) },
          { translateY: iv(t, [s, s + 700], [def.srcTop, def.dstTop], flyEase) },
          { scale: iv(t, [s, s + 700], [1.12, def.end], flyEase) },
        ],
      }}>
      <Text style={a.fly} numberOfLines={1}>{def.text}</Text>
    </Animated.View>
  );
}

/** A value in the email that grows while xypa reads it, then hands over to the flying copy. */
function Hl({ t, delay, children }: { t: V; delay: number; children: string }) {
  return (
    <Animated.View style={{
      transformOrigin: '100% 60%',
      opacity: iv(t, [0, 4249, 4250, 5350, 5550], [1, 1, 0, 0, 1]),
      transform: [{ scale: iv(t, [0, 2900 + delay, 3250 + delay, 5350, 5700], [1, 1, 1.12, 1.12, 1], Easing.bezier(0.3, 1.5, 0.5, 1)) }],
    }}>
      <Text style={a.val}>{children}</Text>
    </Animated.View>
  );
}

export function BankEmailAnimation() {
  const t = useRef(new Animated.Value(0)).current;
  const [W, setW] = useState(330);
  const [paused, setPaused] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {}); }, []);
  useEffect(() => {
    if (paused || reduce) { t.stopAnimation(); t.setValue(FINAL); return; }
    t.setValue(0);
    const loop = Animated.loop(Animated.timing(t, { toValue: LOOP, duration: LOOP, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [paused, reduce, t]);

  const MV_H = 218;
  return (
    <View style={a.stage} onLayout={(e) => setW(e.nativeEvent.layout.width)} accessible accessibilityLabel={tr('Animation: a bank notification arrives, opens into the full email, xypa reads the amount, shop and time, and the payment appears in xypa filed under Groceries.')}>
      <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="g1" cx="0" cy="0" rx="1.2" ry="0.9"><Stop offset="0" stopColor="#D9DBF5" stopOpacity="1" /><Stop offset="0.6" stopColor="#D9DBF5" stopOpacity="0" /></RadialGradient>
          <RadialGradient id="g2" cx="1" cy="1" rx="1" ry="0.8"><Stop offset="0" stopColor="#F6D3CD" stopOpacity="1" /><Stop offset="0.6" stopColor="#F6D3CD" stopOpacity="0" /></RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#g1)" /><Rect width="100%" height="100%" fill="url(#g2)" />
      </Svg>

      <View importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* notification */}
        <Animated.View style={[a.nt, {
          opacity: iv(t, [0, 300, 450, 2150, 2400], [0, 0, 1, 1, 0]),
          transform: [{ translateY: iv(t, [0, 300, 700, 850], [-150, -150, 6, 0]) }, { scale: iv(t, [0, 1700, 1850, 2150, 2400], [1, 1, 0.96, 0.96, 0.98]) }],
        }]}>
          <View style={a.ic}><MailIcon size={18} /></View>
          <View style={{ flex: 1 }}>
            <View style={a.ntHead}><Text style={a.ntB}>M bank</Text><Text style={a.ntSm}>now</Text></View>
            <Text style={a.ntTx} numberOfLines={2}>Card payment 48,600₮ at Nomin Supermarket</Text>
          </View>
        </Animated.View>
        <Animated.View style={[a.tap, { left: W / 2 - 19, opacity: iv(t, [0, 1700, 1820, 2149, 2150], [0, 0, 1, 1, 0]), transform: [{ scale: iv(t, [0, 1700, 1880], [1.4, 1.4, 1]) }] }]}>
          <Animated.View style={[a.ring, { opacity: iv(t, [0, 1800, 2300], [0, 1, 0]), transform: [{ scale: iv(t, [0, 1800, 2300], [1, 1, 2.4]) }] }]} />
        </Animated.View>

        {/* the email */}
        <Animated.View style={[a.mv, {
          height: MV_H, transformOrigin: '50% 0%',
          opacity: iv(t, [0, 2150, 2400, 4250, 4500, 7900, 8350], [0, 0, 1, 1, 0.4, 0.4, 0]),
          transform: [{ scaleX: iv(t, [0, 2150, 2650], [0.96, 0.96, 1], ease) }, { scaleY: iv(t, [0, 2150, 2650], [0.3, 0.3, 1], ease) }],
        }]}>
          <Animated.View style={{ opacity: iv(t, [0, 2350, 2600], [0, 0, 1]), gap: 8 }}>
            <View style={a.mvHead}>
              <View style={[a.ic, { width: 30, height: 30, borderRadius: 8 }]}><MailIcon size={18} /></View>
              <View><Text style={a.ntB}>M bank</Text><Text style={a.ntSm}>Card alert · to me</Text></View>
            </View>
            <Text style={a.mvS}>Card payment</Text>
            <View style={a.row}><Text style={a.lab}>Amount</Text><Hl t={t} delay={0}>48,600₮</Hl></View>
            <View style={a.row}><Text style={a.lab}>Merchant</Text><Hl t={t} delay={300}>Nomin Supermarket</Hl></View>
            <View style={a.row}><Text style={a.lab}>Date</Text><Hl t={t} delay={600}>5 Nov, 12:40</Hl></View>
          </Animated.View>
        </Animated.View>

        {/* the numbers flying into xypa */}
        {FLY.map((f) => <Fly key={f.key} def={f} t={t} W={W} />)}

        {/* the xypa row */}
        <Animated.View style={[a.xr, { opacity: iv(t, [0, 4250, 4550, 7900, 8350], [0, 0, 1, 1, 0]), transform: [{ translateY: iv(t, [0, 4250, 4550, 4750], [91, 91, -4, 0]) }] }]}>
          <View style={a.logo}><Text style={a.logoT}>x</Text></View>
          <View style={a.xrTx}>
            <Animated.View style={{ opacity: iv(t, [0, 5350, 5500], [0, 0, 1]) }}><Text style={a.xrM} numberOfLines={1}>Nomin Supermarket</Text></Animated.View>
            <View style={{ flexDirection: 'row' }}>
              <Animated.View style={{ opacity: iv(t, [0, 5350, 5500], [0, 0, 1]) }}><Text style={a.xrD}>5 Nov, 12:40</Text></Animated.View>
              <Text style={a.xrD}> · M bank</Text>
            </View>
          </View>
          <View style={a.xrEnd}>
            <Animated.View style={{ opacity: iv(t, [0, 5350, 5500], [0, 0, 1]) }}><Text style={a.xrA}>48,600₮</Text></Animated.View>
            <Animated.View style={[a.chip, { transform: [{ scale: iv(t, [0, 5350, 5560, 5700], [0, 0, 1.15, 1]) }] }]}><Text style={a.chipT}>Groceries</Text></Animated.View>
          </View>
        </Animated.View>
      </View>

      <Animated.View style={[a.btnWrap, { opacity: iv(t, [0, 4249, 4250, 7899, 7900], [0.8, 0.8, 0, 0, 0.8]) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={tr(paused ? 'Play animation' : 'Pause animation')} onPress={() => setPaused((p) => !p)} style={a.btn} hitSlop={4}>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="#3F3C37">
            {paused ? <Path d="M7 5v14l12-7z" /> : <G><Rect x="6" y="5" width="4" height="14" rx="1" /><Rect x="14" y="5" width="4" height="14" rx="1" /></G>}
          </Svg>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const a = StyleSheet.create({
  stage: { height: STAGE_H, borderRadius: 24, overflow: 'hidden', backgroundColor: '#EEEBE4', alignSelf: 'stretch' },
  nt: { position: 'absolute', left: 12, right: 12, top: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, paddingVertical: 10, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.86)', shadowColor: '#1F1916', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  ic: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#1F1916', alignItems: 'center', justifyContent: 'center' },
  ntHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  ntB: { fontFamily: font.bold, fontSize: 13, lineHeight: 17, color: INK },
  ntSm: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: MUTED },
  ntTx: { fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: INK },
  tap: { position: 'absolute', top: 44, width: 38, height: 38, borderRadius: 19, backgroundColor: PRESS },
  ring: { ...StyleSheet.absoluteFill, borderRadius: 19, borderWidth: 2, borderColor: 'rgba(31,25,22,.35)' },
  mv: { position: 'absolute', left: 12, right: 12, top: 12, padding: 14, borderRadius: 20, backgroundColor: '#fff', shadowColor: '#1F1916', shadowOpacity: 0.14, shadowRadius: 17, shadowOffset: { width: 0, height: 14 } },
  mvHead: { flexDirection: 'row', gap: 10, alignItems: 'center', height: 34 },
  mvS: { fontFamily: font.bold, fontSize: 17, lineHeight: 22, color: INK },
  row: { height: 34, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: LINE },
  lab: { fontFamily: font.regular, fontSize: 13, color: MUTED },
  val: { fontFamily: font.bold, fontSize: 16, lineHeight: 20, color: INK, fontVariant: ['tabular-nums'] },
  fly: { fontFamily: font.bold, fontSize: 16, lineHeight: 20, color: INK, fontVariant: ['tabular-nums'] },
  xr: { position: 'absolute', left: 12, right: 12, bottom: 12, height: 76, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 18, backgroundColor: '#fff', shadowColor: '#1F1916', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 10 } },
  logo: { width: 34, height: 34, borderRadius: 10, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  logoT: { fontFamily: font.bold, fontSize: 18, color: '#fff' },
  xrTx: { flex: 1, justifyContent: 'center' },
  xrM: { fontFamily: font.bold, fontSize: 14, lineHeight: 18, color: INK },
  xrD: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: MUTED },
  xrEnd: { alignItems: 'flex-end', gap: 4 },
  xrA: { fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: INK },
  chip: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: INK, justifyContent: 'center' },
  chipT: { fontFamily: font.bold, fontSize: 12, color: '#fff' },
  btnWrap: { position: 'absolute', right: 6, bottom: 6 },
  btn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
