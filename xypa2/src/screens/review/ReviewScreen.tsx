import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Money } from '../../design/Amounts';
import { Chip } from '../../design/Fields';
import { Icon } from '../../design/Icon';
import { ScreenFrame } from '../../design/ScreenFrame';
import { Block, Button } from '../../design/Primitives';
import { colors, font } from '../../design/tokens';
import { suggestEnvelope } from '../../logic/suggest';
import { useStore } from '../../store/store';
import { useNav } from '../../nav';

/** Review: one payment at a time. Suggested envelope is highlighted; Previous/Next move through the queue. */
export function ReviewScreen() {
  const st = useStore();
  const nav = useNav();
  // The queue is fixed when Review opens, so already-filed payments can still be re-filed with Previous.
  const queue = useMemo(() => st.unsorted.map((x) => x.id), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [all, setAll] = useState(false);
  const [rule, setRule] = useState(false);

  const done = i >= queue.length;
  const txn = st.txns.find((x) => x.id === queue[i]);

  if (queue.length === 0 || done || !txn) {
    const left = st.unsorted.length;
    return (
      <ScreenFrame title="Review" onBack={nav.back} footer={<Button full title={left ? 'Sort the rest' : 'Back to Plan'} onPress={() => (left ? setI(0) : nav.back())} />}>
        <Block>
          <View style={s.doneIcon}><Icon name="check" size={22} color={colors.white} /></View>
          <Text style={s.doneTitle}>{left ? `${left} left to sort` : 'All sorted'}</Text>
          <Text style={s.sub}>{left ? "Some payments still don't have an envelope." : 'Every payment has an envelope.'}</Text>
        </Block>
      </ScreenFrame>
    );
  }

  const suggested = txn.envelopeId ?? suggestEnvelope(txn.merchant, st.envelopes);
  const ranked = [...st.envelopes].sort((a, b) => (a.id === suggested ? -1 : b.id === suggested ? 1 : 0));
  const shown = all ? ranked : ranked.slice(0, 5);
  const bank = st.accounts.find((a) => a.id === txn.accountId)?.name ?? '';
  const file = (envId: string) => { st.fileTxn(txn.id, envId, rule); setRule(false); setAll(false); setI(i + 1); };

  return (
    <ScreenFrame title={`Review ${i + 1} of ${queue.length}`} onBack={nav.back}
      footer={
        <View style={s.nav}>
          <Button title="Previous" variant="chip" disabled={i === 0} onPress={() => { setI(i - 1); setRule(false); setAll(false); }} />
          <Button title="Next" variant="chip" onPress={() => { setI(i + 1); setRule(false); setAll(false); }} />
        </View>
      }>
      <Block>
        <Text style={s.sub}>{txn.date.slice(5).replace('-', '/')} · {bank}</Text>
        <Money value={txn.amount} style={s.amount} />
        <Text style={s.merchant}>{txn.merchant}</Text>
      </Block>
      <Block>
        <Text style={s.eyebrow}>Which envelope?</Text>
        <View style={s.wrap}>
          {shown.map((e) => <Chip key={e.id} label={e.name} color={e.color} selected={e.id === suggested} accent onPress={() => file(e.id)} />)}
          {!all && st.envelopes.length > 5 ? <Chip label="All envelopes" onPress={() => setAll(true)} /> : null}
        </View>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: rule }} onPress={() => setRule(!rule)} style={s.rule}>
          <View style={[s.box, rule && s.boxOn]}>{rule ? <Icon name="check" size={14} color={colors.white} /> : null}</View>
          <Text style={s.ruleText}>Always use this envelope for {txn.merchant}</Text>
        </Pressable>
      </Block>
    </ScreenFrame>
  );
}

const s = StyleSheet.create({
  sub: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  amount: { fontFamily: font.regular, fontSize: 44, letterSpacing: -1.8, color: colors.ink, marginTop: 6 },
  merchant: { fontFamily: font.regular, fontSize: 18, color: colors.ink2, marginTop: 2 },
  eyebrow: { fontFamily: font.regular, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted, marginBottom: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, marginTop: 14 },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: colors.line2, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  ruleText: { fontFamily: font.regular, fontSize: 14, color: colors.ink, flexShrink: 1 },
  nav: { flexDirection: 'row', justifyContent: 'space-between' },
  doneIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  doneTitle: { fontFamily: font.regular, fontSize: 26, color: colors.ink, letterSpacing: -0.6 },
});
