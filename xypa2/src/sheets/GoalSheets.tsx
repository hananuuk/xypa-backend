import React, { useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { BottomSheet } from '../design/BottomSheet';
import { Field } from '../design/Fields';
import { Button } from '../design/Primitives';
import { colors, font } from '../design/tokens';
import { formatMoney, parseMoney } from '../logic/money';
import { useStore } from '../store/store';

export function NewGoalSheet({ onClose }: { onClose: () => void }) {
  const st = useStore();
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const next = new Date(); next.setFullYear(next.getFullYear() + 1);
  const [by, setBy] = useState(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
  const valid = name.trim() && parseMoney(target) > 0 && /^\d{4}-(0[1-9]|1[0-2])$/.test(by);
  return (
    <BottomSheet visible title="New goal" onClose={onClose}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Cake stand" autoFocus />
      <Field label="Target amount" value={target ? parseMoney(target).toLocaleString('en-US') : ''} onChangeText={setTarget} keyboardType="number-pad" placeholder="0₮" />
      <Field label="Reach it by (YYYY-MM)" value={by} onChangeText={setBy} keyboardType="numbers-and-punctuation" placeholder="2027-10" maxLength={7} />
      <Button full title="Create goal" disabled={!valid} style={{ marginTop: 18 }}
        onPress={() => { st.addGoal({ name: name.trim(), target: parseMoney(target), monthly: 0, by }); onClose(); }} />
    </BottomSheet>
  );
}

export function AddGoalMoneySheet({ id, onClose }: { id: string; onClose: () => void }) {
  const st = useStore();
  const g = st.goals.find((x) => x.id === id);
  const [amount, setAmount] = useState('');
  const value = Math.min(parseMoney(amount), Math.max(0, st.rta));
  if (!g) return null;
  return (
    <BottomSheet visible title={`Add to ${g.name}`} onClose={onClose}>
      <Text style={s.note}>Comes from Ready to Assign ({formatMoney(Math.max(0, st.rta))}).</Text>
      <Field label="Amount" value={amount ? parseMoney(amount).toLocaleString('en-US') : ''} onChangeText={setAmount} keyboardType="number-pad" placeholder="0₮" autoFocus />
      <Button full title={`Add ${formatMoney(value)}`} disabled={value === 0} style={{ marginTop: 18 }} onPress={() => { st.addGoalMoney(id, value); onClose(); }} />
    </BottomSheet>
  );
}

/** Destructive actions always go through a confirmation sheet. */
export function ConfirmDeleteGoalSheet({ id, onClose, onDeleted }: { id: string; onClose: () => void; onDeleted: () => void }) {
  const st = useStore();
  const g = st.goals.find((x) => x.id === id);
  if (!g) return null;
  return (
    <BottomSheet visible title={`Delete ${g.name}?`} onClose={onClose}>
      <Text style={s.note}>{formatMoney(g.saved)} goes back to Ready to Assign.</Text>
      <View style={{ gap: 8, marginTop: 18 }}>
        <Button full variant="accent" title="Delete goal" onPress={() => { st.removeGoal(id); onClose(); onDeleted(); }} />
        <Button full variant="chip" title="Cancel" onPress={onClose} />
      </View>
    </BottomSheet>
  );
}

const s = StyleSheet.create({ note: { fontFamily: font.regular, fontSize: 14, color: colors.muted, lineHeight: 20 } });
