import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Money } from '../../design/Amounts';
import { Block, InnerCard } from '../../design/Primitives';
import { ScreenFrame } from '../../design/ScreenFrame';
import { colors, font } from '../../design/tokens';
import { monthName } from '../../store/calendar';
import { useStore } from '../../store/store';
import { useNav } from '../../nav';

/** Every transaction behind a Reflect row: one envelope, or one merchant, in one month. */
export function TxnListScreen({ title, month, envelopeId, merchant }: { title: string; month: string; envelopeId?: string; merchant?: string }) {
  const st = useStore();
  const nav = useNav();
  const rows = st.txns
    .filter((t) => t.type === 'spend' && t.date.startsWith(month) && (envelopeId ? t.envelopeId === envelopeId : t.merchant === merchant))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const total = rows.reduce((a, t) => a + t.amount, 0);
  const envName = (id: string | null) => st.envelopes.find((e) => e.id === id)?.name ?? 'Not sorted yet';
  const acct = (id: string) => st.accounts.find((a) => a.id === id)?.name;
  return (
    <ScreenFrame title={title} onBack={nav.back}>
      <Block>
        <Text style={s.label}>{monthName(month)} · {rows.length} {rows.length === 1 ? 'transaction' : 'transactions'}</Text>
        <Money value={total} style={s.hero} />
      </Block>
      <Block>
        {rows.length === 0 ? <Text style={s.label}>Nothing here.</Text> : (
          <View style={{ gap: 5 }}>
            {rows.map((t) => (
              <InnerCard key={t.id} style={s.row}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={s.name} numberOfLines={1}>{t.merchant}</Text>
                  <Text style={s.label} numberOfLines={1}>{t.date.slice(5).replace('-', '/')} · {envelopeId ? acct(t.accountId) ?? '' : envName(t.envelopeId)}</Text>
                </View>
                <Money value={-t.amount} style={s.amt} />
              </InnerCard>
            ))}
          </View>
        )}
      </Block>
    </ScreenFrame>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  hero: { fontFamily: font.regular, fontSize: 36, letterSpacing: -1.4, color: colors.ink, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontFamily: font.regular, fontSize: 15, color: colors.ink },
  amt: { fontFamily: font.medium, fontSize: 16, color: colors.ink },
});
