import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Money } from '../design/Amounts';
import { BottomSheet } from '../design/BottomSheet';
import { Chip } from '../design/Fields';
import { Button } from '../design/Primitives';
import { colors, font } from '../design/tokens';
import { categoryLabel, longDate } from '../logic/dayGroups';
import { useStore } from '../store/store';

const SOURCE = { gmail: 'Bank email (Gmail)', statement: 'Bank statement', manual: 'Added by hand' } as const;

/** One transaction: the details, and a way to move it to another category. */
export function TxnSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const st = useStore();
  const t = st.txns.find((x) => x.id === id);
  const [pick, setPick] = useState<string | null>(null);
  const [always, setAlways] = useState(false);
  if (!t) return null;
  const acct = st.accounts.find((a) => a.id === t.accountId);
  const cur = st.envelopes.find((e) => e.id === t.envelopeId);
  const canSort = t.type === 'spend' && t.kind !== 'own';
  const chosen = pick ?? t.envelopeId;
  const rows: [string, string][] = [
    ['Date', longDate(t.date)],
    ['Account', acct?.name ?? 'Unknown'],
    ['Category', categoryLabel(t, cur?.name)],
    ['Source', SOURCE[t.source]],
    ...(t.kind === 'person' ? [['Type', t.type === 'spend' ? 'Sent to a person' : 'Received from a person'] as [string, string]] : []),
    ...(t.kind === 'own' ? [['Type', 'Moved between your own accounts. Not counted as spending.'] as [string, string]] : []),
  ];
  return (
    <BottomSheet visible title={t.merchant} onClose={onClose}>
      <Money value={t.type === 'spend' ? -t.amount : t.amount} style={s.hero} />
      <View style={{ marginTop: 12, gap: 10 }}>
        {rows.map(([k, v]) => (
          <View key={k} style={s.row} accessible accessibilityLabel={`${k}: ${v}`}><Text style={s.k}>{k}</Text><Text style={s.v}>{v}</Text></View>
        ))}
      </View>
      {canSort ? (
        <>
          <Text style={s.eyebrow}>Change category</Text>
          <View style={s.wrap}>
            {st.envelopes.map((e) => <Chip key={e.id} label={e.name} selected={chosen === e.id} onPress={() => setPick(e.id)} />)}
          </View>
          {pick && pick !== t.envelopeId ? (
            <>
              <View style={[s.wrap, { marginTop: 12 }]}><Chip label={`Always file ${t.merchant} here`} selected={always} onPress={() => setAlways(!always)} /></View>
              <Button full title="Save" style={{ marginTop: 16 }} onPress={() => { st.fileTxn(t.id, pick, always); onClose(); }} />
            </>
          ) : null}
        </>
      ) : null}
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  hero: { fontFamily: font.regular, fontSize: 34, letterSpacing: -1.2, color: colors.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  k: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  v: { fontFamily: font.regular, fontSize: 15, color: colors.ink, flexShrink: 1, textAlign: 'right' },
  eyebrow: { fontFamily: font.regular, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted, marginTop: 20, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
