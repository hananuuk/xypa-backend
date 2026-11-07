import React from 'react';
import { tr } from '../i18n';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Money } from './Amounts';
import { InnerCard } from './Primitives';
import { colors, font } from './tokens';
import { categoryLabel, groupByDay } from '../logic/dayGroups';
import { formatMoney } from '../logic/money';
import type { Txn } from '../logic/types';
import { useNav } from '../nav';
import { useStore } from '../store/store';

/** Transactions under Today / Yesterday / date headings. Tap one for details and to change its category. */
export function TxnsByDay({ txns, showAccount }: { txns: Txn[]; showAccount?: boolean }) {
  const st = useStore();
  const nav = useNav();
  const env = (id: string | null) => st.envelopes.find((e) => e.id === id);
  const acct = (id: string) => st.accounts.find((a) => a.id === id)?.name;
  if (txns.length === 0) return <Text style={s.sub}>No transactions yet.</Text>;
  return (
    <View style={{ gap: 14 }}>
      {groupByDay(txns, st.today.iso).map((g) => (
        <View key={g.date} style={{ gap: 5 }}>
          <Text style={s.head} accessibilityRole="header">{g.label}</Text>
          {g.items.map((t) => {
            const cat = categoryLabel(t, env(t.envelopeId)?.name);
            const sub = showAccount ? `${cat} · ${acct(t.accountId) ?? ''}` : cat;
            return (
              <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={tr('{0}, {1}, {2}. Details', t.merchant, formatMoney(t.type === 'spend' ? -t.amount : t.amount), cat)} onPress={() => nav.openSheet({ name: 'txn', id: t.id })}>
                <InnerCard style={s.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={1}>{t.merchant}</Text>
                    <Text style={[s.sub, !t.envelopeId && t.type === 'spend' && !t.kind && { color: colors.accent }]} numberOfLines={1}>{sub}</Text>
                  </View>
                  <Money value={t.type === 'spend' ? -t.amount : t.amount} style={s.amt} />
                </InnerCard>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  head: { fontFamily: font.medium, fontSize: 13, color: colors.muted, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontFamily: font.regular, fontSize: 16, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  amt: { fontFamily: font.medium, fontSize: 17, color: colors.ink },
});
