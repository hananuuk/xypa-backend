import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { tr } from '../../i18n';
import { Text } from '../../design/Text';
import { font } from '../../design/tokens';

/** A bank notification drops in from the top and settles, holds for a moment, then fades and drops in again. */
const LOOP = 3600;
const HOLD = 1500; // the frame shown when Reduce Motion is on
const iv = (t: Animated.Value, input: number[], output: number[]) => t.interpolate({ inputRange: input, outputRange: output, extrapolate: 'clamp' });

export function BankNotificationAnimation() {
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

  return (
    <View style={a.stage} accessible accessibilityLabel={tr('A bank notification arriving: Card payment 48,600₮ at Nomin Supermarket')}>
      <Svg pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="g1" cx="0" cy="0" rx="1.2" ry="0.9"><Stop offset="0" stopColor="#D9DBF5" stopOpacity="1" /><Stop offset="0.6" stopColor="#D9DBF5" stopOpacity="0" /></RadialGradient>
          <RadialGradient id="g2" cx="1" cy="1" rx="1" ry="0.8"><Stop offset="0" stopColor="#F6D3CD" stopOpacity="1" /><Stop offset="0.6" stopColor="#F6D3CD" stopOpacity="0" /></RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#g1)" /><Rect width="100%" height="100%" fill="url(#g2)" />
      </Svg>
      <Animated.View importantForAccessibility="no-hide-descendants" style={[a.nt, {
        opacity: iv(t, [0, 300, 450, 2900, 3300], [0, 0, 1, 1, 0]),
        transform: [{ translateY: iv(t, [0, 300, 700, 850], [-110, -110, 6, 0]) }],
      }]}>
        <View style={a.ic}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Rect x="3" y="5" width="18" height="14" rx="3" /><Path d="M3.5 7l8.5 6 8.5-6" /></Svg>
        </View>
        <View style={{ flex: 1 }}>
          <View style={a.head}><Text style={a.b}>M bank</Text><Text style={a.sm}>now</Text></View>
          <Text style={a.tx} numberOfLines={2}>Card payment 48,600₮ at Nomin Supermarket</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const a = StyleSheet.create({
  stage: { height: 120, borderRadius: 24, overflow: 'hidden', backgroundColor: '#EEEBE4', alignSelf: 'stretch', justifyContent: 'center' },
  nt: { marginHorizontal: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.88)', shadowColor: '#1F1916', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  ic: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#1F1916', alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  b: { fontFamily: font.bold, fontSize: 13, lineHeight: 17, color: '#121212' },
  sm: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: '#5E5B55' },
  tx: { fontFamily: font.regular, fontSize: 13, lineHeight: 17, color: '#121212' },
});
