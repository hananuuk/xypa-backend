import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../design/Primitives';
import { Gauge } from '../../design/Gauge';
import { Icon } from '../../design/Icon';
import { Money, useAmountsHidden } from '../../design/Amounts';
import { colors, font, radius } from '../../design/tokens';
import { formatMoney } from '../../logic/money';
import { needs } from '../../logic/budget';
import type { EnvelopeView } from '../../logic/budget';
import { t } from '../../i18n/en';

/** One envelope. Every card has the same minimum height (88px). */
export function EnvelopeCard({ e, onPress, onCover, grid }: { e: EnvelopeView; onPress: () => void; onCover: () => void; grid?: boolean }) {
  const hidden = useAmountsHidden();
  const overspent = e.left < 0;
  const isBill = e.group === 'Bills';
  const fraction = e.budget > 0 ? e.left / e.budget : 0;
  const amt = (v: number) => formatMoney(v, { hidden });

  const a11y = overspent
    ? t.plan.overspent(e.name, amt(Math.abs(e.left)))
    : isBill
      ? `${e.name}, ${amt(e.left)}, ${e.budget >= e.target ? t.plan.funded : t.plan.needs(amt(needs(e.target, e.budget)))}`
      : `${e.name}, ${amt(e.left)} ${t.plan.left}, ${t.plan.percentLeft(Math.round(fraction * 100))}`;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress}
      style={[s.card, grid && s.cardGrid]}>
      <View style={s.top}>
        <View style={s.nameRow}>
          <View style={[s.dot, { backgroundColor: e.color }]} />
          <Text style={s.name} numberOfLines={1}>{e.name}</Text>
        </View>
        <View style={s.amountRow}>
          <Money value={e.left} style={[s.amount, overspent && { color: colors.accent }]} />
          {overspent && !grid ? <Button title={t.plan.cover} variant="outline" small onPress={onCover} accessibilityLabel={`${t.plan.cover} ${e.name}`} /> : null}
        </View>
      </View>

      {isBill ? (
        <View style={s.bill}>
          {e.budget >= e.target
            ? <View style={s.funded}><Icon name="check" size={14} color={colors.muted} /><Text style={s.sub}>{t.plan.funded}</Text></View>
            : <Text style={[s.sub, { fontFamily: font.medium, color: colors.ink2 }]}>{t.plan.needs(amt(needs(e.target, e.budget)))}</Text>}
        </View>
      ) : (
        <Text style={s.assigned} accessibilityLabel={`of ${amt(e.budget)} assigned`}>{'/ '}<Money value={e.budget} style={s.assigned} /></Text>
      )}
      {!isBill && overspent && grid ? <Button title={t.plan.cover} variant="outline" small onPress={onCover} style={{ alignSelf: 'flex-start', marginTop: 6 }} /> : null}
      {!isBill ? <Gauge fraction={fraction} overspent={overspent} /> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.inner, borderRadius: radius.inner, minHeight: 88, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, overflow: 'hidden', justifyContent: 'space-between' },
  cardGrid: { minHeight: 140 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1, minWidth: 0 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontFamily: font.regular, fontSize: 16, color: colors.ink, flexShrink: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  amount: { fontFamily: font.medium, fontSize: 18, color: colors.ink },
  assigned: { fontFamily: font.regular, fontSize: 13, color: colors.muted, alignSelf: 'flex-end', marginTop: 6, marginBottom: 4 },
  bill: { marginTop: 6, paddingLeft: 20 },
  funded: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sub: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
});
