import React, { useMemo, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
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
  const [open, setOpen] = useState(false);
  const toggle = (v: boolean) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpen(v); };
  const u = UNITS[unit];
  const n = Math.min(num, u.max);
  const numbers = useMemo(() => range(u.max), [u.max]);
  const unitNames = useMemo(() => UNITS.map((x) => tr(x.label)), []);
  return (
    <Poster sky>
      <Pressable accessibilityRole="button" accessibilityLabel={tr('Back')} onPress={onBack} style={s.back}><Icon name="chevronLeft" size={20} /></Pressable>
      <Text style={s.title} accessibilityRole="header">Let's work out your money flow first.</Text>
      <Pressable style={s.mid} onPress={() => open && toggle(false)} accessible={false}>
        <Text style={s.line}>I spend about</Text>
        {open ? (
          <View style={s.pickers}>
            <Wheel label={tr('Amount')} items={numbers} index={n - 1} onIndex={(i) => setNum(i + 1)} width={96} itemHeight={50} fontSize={36} />
            <Wheel label={tr('Unit')} items={unitNames} index={unit} onIndex={(i) => { setUnit(i); setNum((v) => Math.min(v, UNITS[i].max)); }} width={210} itemHeight={50} fontSize={30} />
          </View>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={tr('Change the amount')} onPress={() => toggle(true)} style={s.chip}>
            <Text style={s.chipText}>{n}</Text>
            <Text style={s.chipText}>{unitNames[unit]}</Text>
            <Icon name="chevronDown" size={16} />
          </Pressable>
        )}
        <Text style={s.line}>tögrög a month.</Text>
      </Pressable>
      <BigButton title="Continue" onPress={() => onNext(n * u.mult)} />
    </Poster>
  );
}

const s = StyleSheet.create({
  back: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: { fontFamily: font.medium, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: ob.ink, marginTop: 8 },
  mid: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  line: { fontFamily: font.medium, fontSize: 22, lineHeight: 30, color: ob.ink, textAlign: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 2, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: 'rgba(47,91,224,0.25)' },
  chipText: { fontFamily: font.medium, fontSize: 22, lineHeight: 30, color: BLUE },
  pickers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginVertical: 4 },
});
