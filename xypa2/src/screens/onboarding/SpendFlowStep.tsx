import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { tr } from '../../i18n';
import { Text } from '../../design/Text';
import { Icon } from '../../design/Icon';
import { Wheel } from '../../design/Wheel';
import { font } from '../../design/tokens';
import { BigButton, ob, Poster } from './ui';

const BLUE = '#2F5BE0';
const UNITS = [{ label: 'million', mult: 1_000_000, max: 100 }, { label: 'hundred thousand', mult: 100_000, max: 9 }, { label: 'thousand', mult: 1_000, max: 99 }];
const range = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1));

/** "Let's work out your money flow first." with a sentence the person completes by scrolling. */
export function SpendFlowStep({ onBack, onNext }: { onBack: () => void; onNext: (monthlySpend: number) => void }) {
  const [unit, setUnit] = useState(0);
  const [num, setNum] = useState(2);
  const u = UNITS[unit];
  const n = Math.min(num, u.max);
  const numbers = useMemo(() => range(u.max), [u.max]);
  const unitNames = useMemo(() => UNITS.map((x) => tr(x.label)), []);
  return (
    <Poster sky>
      <Pressable accessibilityRole="button" accessibilityLabel={tr('Back')} onPress={onBack} style={s.back}><Icon name="chevronLeft" size={20} /></Pressable>
      <Text style={s.title} accessibilityRole="header">Let's work out your money flow first.</Text>
      <View style={s.mid}>
        <Text style={s.line}>I spend about</Text>
        <View style={s.pickers}>
          <Wheel label={tr('Amount')} items={numbers} index={n - 1} onIndex={(i) => setNum(i + 1)} width={64} />
          <Wheel label={tr('Unit')} items={unitNames} index={unit} onIndex={(i) => { setUnit(i); setNum((v) => Math.min(v, UNITS[i].max)); }} width={140} />
        </View>
        <Text style={s.line}>tögrög a month.</Text>
      </View>
      <BigButton title="Continue" onPress={() => onNext(n * u.mult)} />
    </Poster>
  );
}

const s = StyleSheet.create({
  back: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: { fontFamily: font.medium, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: ob.ink, marginTop: 8 },
  mid: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  line: { fontFamily: font.medium, fontSize: 22, lineHeight: 30, color: ob.ink, textAlign: 'center' },
  pickers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginVertical: 4 },
});
