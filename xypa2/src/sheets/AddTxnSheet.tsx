import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../design/BottomSheet';
import { Chip, Field, Segmented } from '../design/Fields';
import { Button } from '../design/Primitives';
import { colors, font } from '../design/tokens';
import { parseMoney } from '../logic/money';
import { useStore } from '../store/store';

/** Add transaction: Spent / Received, amount, what for, envelope, paid with. */
export function AddTxnSheet({ envelopeId, onClose }: { envelopeId?: string; onClose: () => void }) {
  const st = useStore();
  const [type, setType] = useState<'spend' | 'income'>('spend');
  const [amount, setAmount] = useState('');
  const [what, setWhat] = useState('');
  const [env, setEnv] = useState<string | null>(envelopeId ?? null);
  const [acc, setAcc] = useState(st.accounts.find((a) => a.kind !== 'Credit' && a.kind !== 'Loan')?.id ?? st.accounts[0]?.id);
  const value = parseMoney(amount);

  return (
    <BottomSheet visible title="Add transaction" onClose={onClose}>
      <Segmented value={type} onChange={setType} options={[{ value: 'spend', label: 'Spent' }, { value: 'income', label: 'Received' }]} />
      <Field label="Amount" value={amount ? value.toLocaleString('en-US') : ''} onChangeText={setAmount} keyboardType="number-pad" placeholder="0₮" autoFocus />
      <Field label="What for" value={what} onChangeText={setWhat} placeholder="Merchant or note" />
      {type === 'spend' ? (
        <>
          <Text style={s.label}>Envelope</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
            <Chip label="Decide later" selected={env === null} onPress={() => setEnv(null)} />
            {st.envelopes.map((e) => <Chip key={e.id} label={e.name} color={e.color} selected={env === e.id} onPress={() => setEnv(e.id)} />)}
          </ScrollView>
        </>
      ) : null}
      <Text style={s.label}>Paid with</Text>
      <View style={s.wrap}>
        {st.accounts.map((a) => <Chip key={a.id} label={a.name} selected={acc === a.id} onPress={() => setAcc(a.id)} />)}
      </View>
      <Button full title="Save" disabled={value === 0 || !acc} style={{ marginTop: 18 }}
        onPress={() => { st.addTxn({ envelopeId: type === 'spend' ? env : null, merchant: what.trim() || (type === 'spend' ? 'Payment' : 'Money in'), amount: value, type, date: st.today.iso, accountId: acc! }); onClose(); }} />
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: font.regular, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted, marginTop: 16, marginBottom: 8 },
  chips: { gap: 6, paddingRight: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
