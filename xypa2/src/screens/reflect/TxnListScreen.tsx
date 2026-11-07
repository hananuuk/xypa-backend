import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Money } from '../../design/Amounts';
import { TxnsByDay } from '../../design/TxnRows';
import { Block } from '../../design/Primitives';
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
    .filter((t) => t.type === 'spend' && t.kind !== 'own' && t.date.startsWith(month) && (envelopeId ? t.envelopeId === envelopeId : t.merchant === merchant))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const total = rows.reduce((a, t) => a + t.amount, 0);
  return (
    <ScreenFrame title={title} onBack={nav.back}>
      <Block>
        <Text style={s.label}>{monthName(month)} · {rows.length} {rows.length === 1 ? 'transaction' : 'transactions'}</Text>
        <Money value={total} style={s.hero} />
      </Block>
      <Block>
        <TxnsByDay txns={rows} showAccount />
      </Block>
    </ScreenFrame>
  );
}

const s = StyleSheet.create({
  label: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  hero: { fontFamily: font.regular, fontSize: 36, letterSpacing: -1.4, color: colors.ink, marginTop: 4 },
});
