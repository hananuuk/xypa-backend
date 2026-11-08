import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { tr } from '../../i18n';
import { Text } from '../../design/Text';
import { Icon } from '../../design/Icon';
import { font } from '../../design/tokens';
import { groupDigits, pressKey, spokenParts } from '../../logic/amountInput';
import { BigButton, ob, Poster } from './ui';

const NAVY = '#1B2A8A';
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

/** One character of the amount. It pops up from below when it first appears. */
function Pop({ ch, size }: { ch: string; size: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(t, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 8 }).start(); }, [t]);
  return (
    <Animated.Text style={{
      fontFamily: font.bold, fontSize: size, lineHeight: size * 1.15, color: NAVY, fontVariant: ['tabular-nums'],
      opacity: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
      transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [size * 0.6, 0] }) }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
    }}>{ch}</Animated.Text>
  );
}

/** Characters with stable keys: digit k keeps its identity as more digits are typed, a comma is new each time it moves. */
function amountChars(digits: string): { key: string; ch: string }[] {
  const out: { key: string; ch: string }[] = [];
  for (let i = 0; i < digits.length; i++) {
    out.push({ key: `d${i}`, ch: digits[i] });
    const right = digits.length - 1 - i;
    if (right > 0 && right % 3 === 0) out.push({ key: `c${i}`, ch: ',' });
  }
  return out;
}

/** "Let's work out your money flow first." Type what you spend in a month; the digits pop in as you type. */
export function SpendFlowStep({ onBack, onNext }: { onBack: () => void; onNext: (monthlySpend: number) => void }) {
  const [digits, setDigits] = useState('2000000');
  const value = Number(digits || 0);
  const chars = amountChars(digits);
  const size = chars.length <= 7 ? 64 : chars.length <= 9 ? 54 : 46;
  const { million, thousand, rest } = spokenParts(value);
  const spoken = [million ? tr('{0} million', million) : '', thousand ? tr('{0} thousand', thousand) : '', rest && value >= 1000 ? String(rest) : ''].filter(Boolean).join(' ');

  const press = (k: string) => {
    const next = pressKey(digits, k);
    if (next === digits) return;
    try { Haptics.selectionAsync(); } catch { /* no haptics */ }
    LayoutAnimation.configureNext({ duration: 170, update: { type: LayoutAnimation.Types.easeInEaseOut } });
    setDigits(next);
  };

  return (
    <Poster image={require('../../../assets/flow-bg.jpg')}>
      <Pressable accessibilityRole="button" accessibilityLabel={tr('Back')} onPress={onBack} style={s.back}><Icon name="chevronLeft" size={20} /></Pressable>
      <Text style={s.title} accessibilityRole="header">Let's work out your money flow first.</Text>
      <Text style={s.ask}>How much do you spend in a month?</Text>
      <View style={s.mid}>
        <View style={s.amount} accessible accessibilityLabel={tr('{0} tögrög a month', groupDigits(digits || '0'))} accessibilityLiveRegion="polite">
          {chars.length ? chars.map((c) => <Pop key={c.key} ch={c.ch} size={size} />) : <Text style={[s.zero, { fontSize: size }]}>0</Text>}
          <Text style={[s.tug, { fontSize: size * 0.5 }]}>₮</Text>
        </View>
        <Text style={s.spoken}>{spoken || ' '}</Text>
      </View>
      <View style={s.pad}>
        {KEYS.map((k, i) => k === '' ? <View key={i} style={s.key} /> : (
          <Pressable key={k} accessibilityRole="button" accessibilityLabel={k === 'back' ? tr('Delete') : k} onPress={() => press(k)}
            onLongPress={k === 'back' ? () => { LayoutAnimation.configureNext({ duration: 170, update: { type: LayoutAnimation.Types.easeInEaseOut } }); setDigits(''); } : undefined}
            style={({ pressed }) => [s.key, pressed && s.keyDown]}>
            {k === 'back' ? <Text style={s.keyText}>⌫</Text> : <Text style={s.keyText}>{k}</Text>}
          </Pressable>
        ))}
      </View>
      <BigButton title="Continue" disabled={value <= 0} onPress={() => onNext(value)} />
    </Poster>
  );
}

const s = StyleSheet.create({
  back: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: { fontFamily: font.medium, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: ob.ink, marginTop: 8 },
  ask: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ob.ink, opacity: 0.7, marginTop: 10 },
  mid: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 110 },
  amount: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  zero: { fontFamily: font.bold, color: NAVY, opacity: 0.25 },
  tug: { fontFamily: font.medium, color: NAVY, opacity: 0.55, marginLeft: 4, marginTop: 4 },
  spoken: { fontFamily: font.regular, fontSize: 15, color: ob.ink, opacity: 0.7, marginTop: 6 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  key: { width: '33.333%', height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 31 },
  keyDown: { backgroundColor: 'rgba(255,255,255,0.55)' },
  keyText: { fontFamily: font.medium, fontSize: 28, color: ob.ink },
});
