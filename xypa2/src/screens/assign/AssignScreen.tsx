import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Money } from '../../design/Amounts';
import { ScreenFrame } from '../../design/ScreenFrame';
import { Block, Button, InnerCard } from '../../design/Primitives';
import { colors, font } from '../../design/tokens';
import { formatMoney, parseMoney } from '../../logic/money';
import { needs } from '../../logic/budget';
import { useStore } from '../../store/store';
import { useNav } from '../../nav';

/**
 * Assign: split Ready to Assign across envelopes. "Left to assign" updates live and can never go below 0.
 * Inputs always show real values (hide-amounts does not apply inside input sheets).
 */
export function AssignScreen() {
  const st = useStore();
  const nav = useNav();
  const start = useMemo(() => Object.fromEntries(st.envelopes.map((e) => [e.id, e.budget])), []); // eslint-disable-line react-hooks/exhaustive-deps
  const startRta = useMemo(() => st.rta, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [budgets, setBudgets] = useState<Record<string, number>>(start);

  const used = st.envelopes.reduce((sum, e) => sum + (budgets[e.id] - start[e.id]), 0);
  const leftToAssign = startRta - used;

  /** Set one envelope's budget, never letting the pool go below 0. */
  const set = (id: string, value: number) => {
    const others = used - (budgets[id] - start[id]);
    const maxForThis = start[id] + Math.max(0, startRta - others);
    setBudgets({ ...budgets, [id]: Math.max(0, Math.min(value, Math.max(maxForThis, start[id] - 0))) });
  };

  const autoFill = () => {
    let pool = leftToAssign;
    const next = { ...budgets };
    for (const e of st.envelopes) {
      const need = needs(e.target, next[e.id]);
      const give = Math.min(need, Math.max(0, pool));
      next[e.id] += give; pool -= give;
    }
    setBudgets(next);
  };

  const done = () => {
    st.assign(budgets);
    if (leftToAssign === 0) st.markChecklist('assign');
    nav.back();
  };

  return (
    <ScreenFrame title="Assign" onBack={nav.back}
      footer={<Button full title="Done" onPress={done} />}>
      <Block>
        <Text style={s.label}>Left to assign</Text>
        <Money always value={leftToAssign} style={[s.hero, leftToAssign === 0 && { color: colors.muted }]} />
        <Button title="Auto-fill" variant="chip" onPress={autoFill} style={{ alignSelf: 'flex-start', marginTop: 10 }} />
      </Block>
      <Block padding={false} style={{ padding: 6, gap: 5 }}>
        {st.envelopes.map((e) => {
          const v = st.views.find((x) => x.id === e.id)!;
          const b = budgets[e.id];
          const spent = v.spent;
          const hint = spent > b ? { text: `Cover ${formatMoney(spent - b)}`, set: spent, accent: true }
            : b >= e.target && e.target > 0 ? { text: 'Funded', set: null, accent: false }
            : e.target > 0 ? { text: `Needs ${formatMoney(needs(e.target, b))}`, set: e.target, accent: false } : null;
          return (
            <InnerCard key={e.id} style={s.row}>
              <View style={s.rowTop}>
                <View style={s.nameRow}><View style={[s.dot, { backgroundColor: e.color }]} /><Text style={s.name}>{e.name}</Text></View>
                <TextInput
                  accessibilityLabel={`${e.name} amount`} keyboardType="number-pad" value={b ? b.toLocaleString('en-US') : ''} placeholder="0"
                  onChangeText={(txt) => set(e.id, parseMoney(txt))} style={s.input} selectTextOnFocus />
              </View>
              {hint ? (
                <Button small title={hint.text} variant={hint.accent ? 'outline' : 'chip'} disabled={hint.set === null}
                  onPress={() => hint.set !== null && set(e.id, hint.set)} style={{ alignSelf: 'flex-start' }} />
              ) : null}
            </InnerCard>
          );
        })}
      </Block>
    </ScreenFrame>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  hero: { fontFamily: font.regular, fontSize: 44, letterSpacing: -1.8, color: colors.ink, marginTop: 4 },
  row: { gap: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontFamily: font.regular, fontSize: 16, color: colors.ink },
  input: { fontFamily: font.medium, fontSize: 18, color: colors.ink, textAlign: 'right', minWidth: 110, minHeight: 44, backgroundColor: colors.white, borderRadius: 14, paddingHorizontal: 12, fontVariant: ['tabular-nums'] },
});
