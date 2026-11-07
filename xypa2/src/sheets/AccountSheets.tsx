import React, { useState } from 'react';
import { tr } from '../i18n';
import { StyleSheet, View } from 'react-native';
import { Text } from '../design/Text';
import { BottomSheet } from '../design/BottomSheet';
import { Chip, Field } from '../design/Fields';
import { Button, InnerCard } from '../design/Primitives';
import { colors, font } from '../design/tokens';
import { formatMoney, parseMoney } from '../logic/money';
import { spentByDay } from '../logic/budget';
import { BANKS } from '../data/banks';
import { useStore } from '../store/store';

/** Fix sync: why a bank might have stopped syncing, and a way to update the balance by hand. */
export function FixSyncSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const st = useStore();
  const a = st.accounts.find((x) => x.id === id);
  const [balance, setBalance] = useState('');
  if (!a) return null;
  return (
    <BottomSheet visible title={a.syncOk ? 'Fix balance' : tr('No {0} emails lately', a.name)} onClose={onClose}>
      {!a.syncOk ? (
        <InnerCard style={{ gap: 6 }}>
          <Text style={s.body}>Likely reasons:</Text>
          <Text style={s.body}>• {a.name} alerts are turned off in the bank app</Text>
          <Text style={s.body}>• The Gmail connection expired</Text>
          <Text style={s.body}>• The bank changed its email format</Text>
        </InnerCard>
      ) : null}
      <Field label={tr('Balance in your {0} app', a.name)} value={balance ? parseMoney(balance).toLocaleString('en-US') : ''} onChangeText={setBalance} keyboardType="number-pad" placeholder={formatMoney(a.balance)} autoFocus />
      <Button full title="Update balance by hand" disabled={!balance} style={{ marginTop: 18 }} onPress={() => { st.fixBalance(id, parseMoney(balance)); onClose(); }} />
    </BottomSheet>
  );
}

export function AddAccountSheet({ onClose }: { onClose: () => void }) {
  const st = useStore();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'Checking' | 'Savings' | 'Credit' | 'Loan' | 'Wallet'>('Checking');
  const [balance, setBalance] = useState('');
  return (
    <BottomSheet visible title="Add account" onClose={onClose}>
      <Text style={s.eyebrow}>Bank</Text>
      <View style={s.wrap}>{BANKS.map((b) => <Chip key={b.id} label={b.name} selected={name === b.name} onPress={() => setName(b.name)} />)}</View>
      <Field label="Name" value={name} onChangeText={setName} placeholder={tr('Pick a bank or type a name')} />
      <Text style={s.eyebrow}>Type</Text>
      <View style={s.wrap}>{(['Checking', 'Savings', 'Credit', 'Loan', 'Wallet'] as const).map((k) => <Chip key={k} label={k} selected={kind === k} onPress={() => setKind(k)} />)}</View>
      <Field label="Balance" value={balance ? parseMoney(balance).toLocaleString('en-US') : ''} onChangeText={setBalance} keyboardType="number-pad" placeholder={tr('0₮')} />
      <Button full title="Add account" disabled={!name.trim()} style={{ marginTop: 18 }}
        onPress={() => { st.addAccount({ name: name.trim(), kind, balance: (kind === 'Credit' || kind === 'Loan' ? -1 : 1) * parseMoney(balance) }); onClose(); }} />
    </BottomSheet>
  );
}

/** Day sheet for the Reflect calendar: that day's payments. */
export function DaySheet({ day, onClose }: { day: number; onClose: () => void }) {
  const st = useStore();
  const date = `${st.month}-${String(day).padStart(2, '0')}`;
  const txns = st.txns.filter((t) => t.date === date);
  const total = spentByDay(st.txns, st.month)[day] ?? 0;
  return (
    <BottomSheet visible title={`${date.slice(5).replace('-', '/')}`} onClose={onClose}>
      <Text style={s.body}>{total === 0 ? 'Nothing spent.' : tr('{0} spent', formatMoney(total))}</Text>
      <View style={{ gap: 5, marginTop: 10 }}>
        {txns.map((t) => (
          <InnerCard key={t.id} style={s.row}><Text style={s.name} numberOfLines={1}>{t.merchant}</Text><Text style={s.name}>{formatMoney(t.type === 'spend' ? -t.amount : t.amount)}</Text></InnerCard>
        ))}
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  body: { fontFamily: font.regular, fontSize: 14, color: colors.ink2, lineHeight: 20 },
  eyebrow: { fontFamily: font.regular, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted, marginTop: 16, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { fontFamily: font.regular, fontSize: 15, color: colors.ink, flexShrink: 1 },
});
