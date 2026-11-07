import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Money } from '../../design/Amounts';
import { ScreenFrame } from '../../design/ScreenFrame';
import { Block, Button, InnerCard, SectionLabel } from '../../design/Primitives';
import { Icon } from '../../design/Icon';
import { colors, font } from '../../design/tokens';
import { needs } from '../../logic/budget';
import { useStore } from '../../store/store';
import { useNav } from '../../nav';
import { t } from '../../i18n/en';

export function EnvelopeDetail({ id }: { id: string }) {
  const st = useStore();
  const nav = useNav();
  const e = st.views.find((x) => x.id === id);
  if (!e) return null;
  const txns = st.txns.filter((x) => x.envelopeId === id && x.date.startsWith(st.month)).sort((a, b) => (a.date < b.date ? 1 : -1));
  const overspent = e.left < 0;
  const fraction = e.budget > 0 ? Math.max(0, Math.min(1, e.left / e.budget)) : 0;
  const funded = e.budget >= e.target;

  return (
    <ScreenFrame title={e.name} onBack={nav.back}>
      <Block>
        <Text style={s.label}>Left this month</Text>
        <Money value={e.left} style={[s.hero, overspent && { color: colors.accent }]} />
        <View style={s.track} accessibilityLabel={`${Math.round(fraction * 100)}% left`}>
          <View style={[s.fill, { width: `${(overspent ? 1 : fraction) * 100}%`, backgroundColor: overspent ? colors.accent : colors.gaugeFill }]} />
        </View>
        <Text style={s.sub}>
          <Money value={e.spent} /> spent of <Money value={e.budget} />
        </Text>
        <View style={s.buttons}>
          <Button title="Move money in" onPress={() => nav.openSheet({ name: 'moveIn', id })} variant="chip" />
          <Button title="Add transaction" onPress={() => nav.openSheet({ name: 'addTxn', envelopeId: id })} />
          {overspent ? <Button title={t.plan.cover} variant="outline" onPress={() => nav.openSheet({ name: 'cover', id })} /> : null}
        </View>
      </Block>

      {e.target > 0 ? (
        <Block>
          <Text style={s.label}>Monthly target</Text>
          <View style={s.row}>
            <Money value={e.target} style={s.targetAmt} />
            {funded ? <View style={s.status}><Icon name="check" size={16} color={colors.muted} /><Text style={s.sub}>{t.plan.funded}</Text></View>
              : <Text style={[s.sub, { fontFamily: font.medium, color: colors.ink2 }]}>{t.plan.needs(needsText(needs(e.target, e.budget)))}</Text>}
          </View>
        </Block>
      ) : null}

      <Block>
        <SectionLabel title="This month's transactions" />
        {txns.length === 0 ? <Text style={s.sub}>Nothing yet this month.</Text> : (
          <View style={{ gap: 5 }}>
            {txns.map((x) => (
              <InnerCard key={x.id} style={s.txn}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={s.txnName} numberOfLines={1}>{x.merchant}</Text>
                  <Text style={s.sub}>{x.date.slice(5).replace('-', '/')}</Text>
                </View>
                <Money value={x.type === 'spend' ? -x.amount : x.amount} style={s.txnAmt} />
              </InnerCard>
            ))}
          </View>
        )}
      </Block>
    </ScreenFrame>
  );
}

import { formatMoney } from '../../logic/money';
const needsText = (n: number) => formatMoney(n);

const s = StyleSheet.create({
  label: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  hero: { fontFamily: font.regular, fontSize: 44, letterSpacing: -1.8, color: colors.ink, marginTop: 4 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.gaugeTrack, overflow: 'hidden', marginTop: 12 },
  fill: { height: 6, borderRadius: 3 },
  sub: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 8 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  targetAmt: { fontFamily: font.regular, fontSize: 24, color: colors.ink },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  txn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  txnName: { fontFamily: font.regular, fontSize: 15, color: colors.ink },
  txnAmt: { fontFamily: font.medium, fontSize: 16, color: colors.ink },
});
