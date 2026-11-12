import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { tr } from '../../i18n';
import { Text } from '../../design/Text';
import { colors, font } from '../../design/tokens';
import { CATEGORY_CHOICES } from '../../logic/amountInput';
import { formatMoney } from '../../logic/money';
import { monthlySpend, RecurringMerchant } from '../../logic/scan';
import type { Found } from '../../logic/scan';
import { monthName } from '../../store/calendar';
import { BigButton, DashedAdd, ob, StepFrame } from './ui';

const Link = ({ title, onPress }: { title: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={tr(title)} onPress={onPress} style={s.link}><Text style={s.linkT}>{title}</Text></Pressable>
);

/** Does the person get bank alerts by email? Yes leads to Gmail access, No to a statement. */
export function AlertQuestion({ onBack, onYes, onNo }: { onBack: () => void; onYes: () => void; onNo: () => void }) {
  return (
    <StepFrame step={2} title="Does your bank email you when you pay?" subtitle="Most banks can send an email every time money moves, like “Card payment 12,000₮ at EMART”." onBack={onBack}
      footer={<><BigButton title="Yes, I get alerts" onPress={onYes} /><Link title="No, I don't" onPress={onNo} /></>}>
      <Text style={s.body}>If you do, xypa can read those emails and fill in your spending for you. If you don't, a bank statement works just as well.</Text>
      <Image source={require('../../../assets/lemon-glass.webp')} style={s.art} contentFit="contain" accessible={false} />
    </StepFrame>
  );
}

/** No alerts: offer a statement, otherwise the person adds categories by hand. */
export function AskStatement({ onBack, onYes, onNo }: { onBack: () => void; onYes: () => void; onNo: () => void }) {
  return (
    <StepFrame step={3} title="Would you rather upload a statement?" subtitle="Your last 3 months from your bank app. xypa reads it on the spot to find your spending." onBack={onBack}
      footer={<><BigButton title="Yes, upload a statement" onPress={onYes} /><Link title="No, I'll add categories myself" onPress={onNo} /></>}>
      <Text style={s.body}>You can use a PDF, Excel or CSV file.</Text>
    </StepFrame>
  );
}

/** What was found: the count and what was spent in each month. */
export function FoundSummary({ found, recurring, onBack, onNext }: { found: Found[]; recurring: number; onBack: () => void; onNext: () => void }) {
  const months = monthlySpend(found);
  return (
    <StepFrame step={4} title={tr('We found {0} transactions', found.length)} subtitle="Within the last three months." onBack={onBack}
      footer={<BigButton title="Continue" onPress={onNext} />}>
      {months.map((m) => (
        <View key={m.month} style={s.row}>
          <Text style={s.rowL}>{monthName(m.month)}</Text>
          <Text style={s.rowV}>{formatMoney(m.total)}</Text>
        </View>
      ))}
      {recurring > 0 ? <Text style={s.note}>{tr('{0} places came up more than twice. Next, let\'s sort them into categories.', recurring)}</Text> : null}
    </StepFrame>
  );
}

export type Pick = { key: string; merchant: string; category: string };

/** Sort the merchants that came up more than twice into categories. People can add their own category. */
export function Categorize({ items, onBack, onNext }: { items: RecurringMerchant[]; onBack: () => void; onNext: (picks: Pick[]) => void }) {
  const [chosen, setChosen] = useState<Record<string, string>>(() => Object.fromEntries(items.filter((i) => i.suggested).map((i) => [i.key, i.suggested as string])));
  const [custom, setCustom] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const choices = [...CATEGORY_CHOICES, ...custom];
  const add = () => {
    const n = name.trim();
    if (n && !choices.some((c) => c.toLowerCase() === n.toLowerCase())) setCustom((c) => [...c, n]);
    setName(''); setAdding(false);
  };
  const done = items.filter((i) => chosen[i.key]).length;
  return (
    <StepFrame step={4} title="Let's categorize your regular spending" subtitle="These places came up more than twice. Pick a category for each, or add your own." onBack={onBack}
      footer={<><BigButton title={done ? tr('Continue with {0} sorted', done) : 'Continue'} onPress={() => onNext(items.filter((i) => chosen[i.key]).map((i) => ({ key: i.key, merchant: i.merchant, category: chosen[i.key] })))} /></>}>
      {items.map((i) => (
        <View key={i.key} style={s.card}>
          <View style={s.cardTop}>
            <Text style={s.merchant} numberOfLines={1}>{i.merchant}</Text>
            <Text style={s.meta}>{tr('{0} payments · {1}', i.count, formatMoney(i.total))}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
            {[...choices].sort((a, b) => (a === i.suggested ? -1 : b === i.suggested ? 1 : 0)).map((c) => {
              const on = chosen[i.key] === c;
              return (
                <Pressable key={c} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={tr(c)}
                  onPress={() => setChosen((cur) => { const n = { ...cur }; if (on) delete n[i.key]; else n[i.key] = c; return n; })}
                  style={[s.chip, on && { backgroundColor: ob.navy, borderColor: ob.navy }]}>
                  <Text style={[s.chipT, on && { color: colors.white }]}>{tr(c)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ))}
      {adding ? (
        <View style={s.addRow}>
          <TextInput autoFocus value={name} onChangeText={setName} onSubmitEditing={add} returnKeyType="done" placeholder={tr('Category name')} placeholderTextColor={colors.muted} accessibilityLabel={tr('Category name')} style={s.input} />
          <Pressable accessibilityRole="button" accessibilityLabel={tr('Add')} onPress={add} style={s.addBtn}><Text style={s.addBtnT}>Add</Text></Pressable>
        </View>
      ) : <DashedAdd label="+ Add category" onPress={() => setAdding(true)} />}
    </StepFrame>
  );
}

const s = StyleSheet.create({
  link: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  linkT: { fontFamily: font.medium, fontSize: 16, color: ob.ink },
  art: { alignSelf: 'center', width: 260, height: 260, marginTop: 12 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: ob.ink },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 52 },
  rowL: { fontFamily: font.regular, fontSize: 17, color: ob.ink, flexShrink: 1 },
  rowV: { fontFamily: font.bold, fontSize: 20, color: ob.navy },
  note: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.ink2, marginTop: 10 },
  card: { paddingVertical: 12, gap: 10 },
  cardTop: { gap: 2 },
  merchant: { fontFamily: font.medium, fontSize: 17, color: ob.ink },
  meta: { fontFamily: font.regular, fontSize: 13, color: colors.ink2 },
  chips: { gap: 8, paddingRight: 8 },
  chip: { minHeight: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(27,42,138,0.18)', backgroundColor: 'rgba(255,255,255,0.82)', alignItems: 'center', justifyContent: 'center' },
  chipT: { fontFamily: font.medium, fontSize: 15, color: ob.ink },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
  input: { flex: 1, fontFamily: font.regular, fontSize: 16, color: ob.ink, backgroundColor: colors.white, borderRadius: 23, minHeight: 46, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(27,42,138,0.18)' },
  addBtn: { minHeight: 46, paddingHorizontal: 20, borderRadius: 23, backgroundColor: ob.navy, alignItems: 'center', justifyContent: 'center' },
  addBtnT: { fontFamily: font.medium, fontSize: 16, color: colors.white },
});
