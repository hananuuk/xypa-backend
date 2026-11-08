import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { tr } from '../../i18n';
import { Text } from '../../design/Text';
import { Icon } from '../../design/Icon';
import { Wheel } from '../../design/Wheel';
import { font } from '../../design/tokens';
import { BigButton, ob, Poster } from './ui';

const NAVY = '#1B2A8A';
const UNITS = [{ label: 'million', mult: 1_000_000, max: 100 }, { label: 'hundred thousand', mult: 100_000, max: 9 }, { label: 'thousand', mult: 1_000, max: 99 }];
const range = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1));
const H = 60;

/** "Let's work out your money flow first." Two curved wheels: how many, and of what (million, hundred thousand, thousand). */
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
        <View style={s.wheels}>
          <View pointerEvents="none" style={[s.box, { top: H * 3, height: H }]} />
          <Wheel rows={7} curve="left" align="right" label={tr('Amount')} items={numbers} index={n - 1} onIndex={(i) => setNum(i + 1)} width={120} itemHeight={H} fontSize={44} color={NAVY} />
          <Wheel rows={7} curve="right" align="left" bend={0.7} label={tr('Unit')} items={unitNames} index={unit} onIndex={(i) => { setUnit(i); setNum((v) => Math.min(v, UNITS[i].max)); }} width={190} itemHeight={H} fontSize={28} color={NAVY} />
        </View>
        <Text style={s.ask}>How much do you spend in a month?</Text>
      </View>
      <BigButton title="Continue" onPress={() => onNext(n * u.mult)} />
    </Poster>
  );
}

const s = StyleSheet.create({
  back: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: { fontFamily: font.medium, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: ob.ink, marginTop: 8 },
  mid: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  wheels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  box: { position: 'absolute', left: -6, right: -6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(47,91,224,0.3)' },
  ask: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ob.ink, opacity: 0.7, textAlign: 'center', marginTop: 18 },
});
