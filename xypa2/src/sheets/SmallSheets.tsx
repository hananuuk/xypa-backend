import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../design/BottomSheet';
import { Chip, Field } from '../design/Fields';
import { Button, InnerCard } from '../design/Primitives';
import { colors, font } from '../design/tokens';
import { everydayLeft } from '../logic/budget';
import { formatMoney, parseMoney } from '../logic/money';
import { MONTH_NAMES, monthName } from '../store/calendar';
import { useNav } from '../nav';
import { useStore } from '../store/store';

/** Safe to spend, explained: the maths line by line. */
export function SafeExplainSheet({ onClose }: { onClose: () => void }) {
  const st = useStore();
  const everyday = everydayLeft(st.views);
  const daysLeft = Math.max(1, st.today.monthDays - st.today.day);
  const weekDays = Math.min(7 - st.today.weekday, Math.max(1, st.today.monthDays - st.today.day + 1));
  return (
    <BottomSheet visible title="How safe to spend works" onClose={onClose}>
      <InnerCard style={{ gap: 12 }}>
        <Line a="Left in everyday envelopes" b={formatMoney(everyday)} />
        <Line a="Days to go this month" b={String(daysLeft)} />
        <Line a={`${formatMoney(everyday)} ÷ ${daysLeft}, rounded down`} b={formatMoney(st.safe.today)} strong />
        <Line a={`Today × ${weekDays} days left this week`} b={formatMoney(st.safe.week)} />
        <Line a="Rest of the month" b={formatMoney(st.safe.month)} />
      </InnerCard>
      <Text style={s.note}>Overspent envelopes count as 0. Bills and goals are never included, so this is only money you can spend freely.</Text>
      <Button full title="Got it" onPress={onClose} style={{ marginTop: 14 }} />
    </BottomSheet>
  );
}

function Line({ a, b, strong }: { a: string; b: string; strong?: boolean }) {
  return (
    <View style={s.line}>
      <Text style={[s.a, strong && { fontFamily: font.medium }]}>{a}</Text>
      <Text style={[s.b, strong && { color: colors.accent }]}>{b}</Text>
    </View>
  );
}

/** Month picker (spec s04). Months before the first transaction are greyed; the next month opens the new-month preview. */
export function MonthPickerSheet({ onClose }: { onClose: () => void }) {
  const st = useStore();
  const nav = useNav();
  const year = parseInt(st.month.slice(0, 4), 10);
  const cur = parseInt(st.month.slice(5, 7), 10);
  const first = st.txns.map((t) => t.date.slice(0, 7)).sort()[0] ?? st.month;
  const firstIdx = first.startsWith(String(year)) ? parseInt(first.slice(5, 7), 10) : 1;
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return (
    <BottomSheet visible title={String(year)} onClose={onClose}>
      <View style={s.grid}>
        {names.map((n, i) => {
          const m = i + 1;
          const disabled = m < firstIdx || m > cur + 1;
          const selected = m === cur;
          const isNext = m === cur + 1;
          return (
            <View key={n} style={s.cellWrap}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} accessibilityLabel={`${MONTH_NAMES[i]}${isNext ? ', preview the new month' : ''}`}
                disabled={disabled || selected}
                onPress={() => { onClose(); if (isNext) nav.push({ name: 'newMonth' }); }}
                style={[s.cell, selected && s.cellOn, isNext && s.cellNext, !disabled && !selected && !isNext && s.cellOpen]}>
                <Text style={[s.cellText, disabled && { color: colors.muted }, selected && { color: colors.white }]}>{n}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <Text style={s.note}>Months before you started are greyed out. {MONTH_NAMES[cur % 12]} opens a preview of the new-month moment.</Text>
    </BottomSheet>
  );
}

export function NewEnvelopeSheet({ onClose }: { onClose: () => void }) {
  const st = useStore();
  const [name, setName] = useState('');
  const [group, setGroup] = useState<'Everyday' | 'Bills'>('Everyday');
  const [target, setTarget] = useState('');
  return (
    <BottomSheet visible title="New envelope" onClose={onClose}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Gym" autoFocus />
      <Text style={s.eyebrow}>Group</Text>
      <View style={s.wrap}>
        {(['Everyday', 'Bills'] as const).map((g) => <Chip key={g} label={g} selected={group === g} onPress={() => setGroup(g)} />)}
      </View>
      <Field label="Monthly target (optional)" value={target ? parseMoney(target).toLocaleString('en-US') : ''} onChangeText={setTarget} keyboardType="number-pad" placeholder="0₮" />
      <Button full title="Create envelope" disabled={!name.trim()} style={{ marginTop: 18 }}
        onPress={() => { st.addEnvelope({ name: name.trim(), group, target: parseMoney(target) }); onClose(); }} />
    </BottomSheet>
  );
}

/** Move money from Ready to Assign into one envelope. */
export function MoveInSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const st = useStore();
  const e = st.envelopes.find((x) => x.id === id);
  const [amount, setAmount] = useState('');
  const value = Math.min(parseMoney(amount), Math.max(0, st.rta));
  if (!e) return null;
  return (
    <BottomSheet visible title={`Move money into ${e.name}`} onClose={onClose}>
      <Text style={s.note}>Ready to Assign has {formatMoney(Math.max(0, st.rta))}.</Text>
      <Field label="Amount" value={amount ? parseMoney(amount).toLocaleString('en-US') : ''} onChangeText={setAmount} keyboardType="number-pad" placeholder="0₮" autoFocus />
      <Button full title={`Move ${formatMoney(value)}`} disabled={value === 0} style={{ marginTop: 18 }}
        onPress={() => { st.assign({ [id]: e.budget + value }); onClose(); }} />
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  a: { fontFamily: font.regular, fontSize: 14, color: colors.ink2, flexShrink: 1 },
  b: { fontFamily: font.medium, fontSize: 15, color: colors.ink, fontVariant: ['tabular-nums'] },
  note: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 10, lineHeight: 19 },
  month: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 56 },
  monthText: { fontFamily: font.regular, fontSize: 17, color: colors.ink },
  eyebrow: { fontFamily: font.regular, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted, marginTop: 16, marginBottom: 8 },
  wrap: { flexDirection: 'row', gap: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cellWrap: { width: '33.33%', padding: 4 },
  cell: { height: 56, borderRadius: 999, borderWidth: 1.5, borderColor: colors.line2, alignItems: 'center', justifyContent: 'center' },
  cellOpen: { backgroundColor: colors.white },
  cellOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  cellNext: { borderStyle: 'dashed' },
  cellText: { fontFamily: font.medium, fontSize: 16, color: colors.ink },
});
