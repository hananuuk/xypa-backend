import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { tr } from '../../i18n';
import { BankAvatar } from '../../design/BankAvatar';
import { Text } from '../../design/Text';
import { colors, font } from '../../design/tokens';
import { ob } from './ui';

/** Bank alerts arrive one after another, like lock-screen notifications: real bank logos, app colours, no box around them. */
const ALERTS = [
  { bank: 'M bank', text: 'Card payment 48,600₮ at Nomin Supermarket' },
  { bank: 'Khan Bank', text: 'Card payment 7,500₮ at Tom N Toms Coffee' },
  { bank: 'Golomt Bank', text: 'Card payment 32,000₮ at Shell' },
];
const FIRST = 300;
const STEP = 650;
const FADE_AT = 4400;
const LOOP = 5400;
const HOLD = 3000; // the frame shown when Reduce Motion is on
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
    <View style={a.wrap} accessible accessibilityLabel={tr('Bank notifications arriving, like Card payment 48,600₮ at Nomin Supermarket')}>
      {ALERTS.map((n, i) => {
        const s = FIRST + i * STEP;
        return (
          <Animated.View key={n.bank} importantForAccessibility="no-hide-descendants" style={[a.card, {
            opacity: iv(t, [0, s, s + 250, FADE_AT, FADE_AT + 400], [0, 0, 1, 1, 0]),
            transform: [
              { translateY: iv(t, [0, s, s + 320, s + 480], [-64, -64, 6, 0]) },
              { scale: iv(t, [0, s, s + 480], [0.94, 0.94, 1]) },
            ],
          }]}>
            <BankAvatar name={n.bank} size={42} />
            <View style={{ flex: 1 }}>
              <View style={a.head}><Text style={a.bank} numberOfLines={1}>{n.bank}</Text><Text style={a.now}>now</Text></View>
              <Text style={a.tx} numberOfLines={2}>{n.text}</Text>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const a = StyleSheet.create({
  wrap: { gap: 12, paddingTop: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: 'rgba(27,42,138,0.08)',
    shadowColor: ob.navy, shadowOpacity: 0.14, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  bank: { fontFamily: font.bold, fontSize: 14, lineHeight: 18, color: ob.navy, flexShrink: 1 },
  now: { fontFamily: font.regular, fontSize: 12, lineHeight: 18, color: colors.ink2 },
  tx: { fontFamily: font.regular, fontSize: 14, lineHeight: 19, color: ob.ink },
});
