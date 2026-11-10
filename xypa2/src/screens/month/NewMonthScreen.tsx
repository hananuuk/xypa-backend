import React, { useMemo } from 'react';
import { getLang, tr } from '../../i18n';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../design/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Money } from '../../design/Amounts';
import { Block, Button, InnerCard } from '../../design/Primitives';
import { colors, font } from '../../design/tokens';
import { spentByDay } from '../../logic/budget';
import { MONTH_NAMES } from '../../store/calendar';
import { useStore } from '../../store/store';
import { useNav } from '../../nav';

/** Preview of the new-month moment (spec §3.7). Leftovers stay in their envelopes; only new income needs a job. */
export function NewMonthScreen() {
  const st = useStore();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const mi = parseInt(st.month.slice(5, 7), 10) - 1;
  const cur = tr(MONTH_NAMES[mi]);
  const next = tr(MONTH_NAMES[(mi + 1) % 12]);
  const nextYear = parseInt(st.month.slice(0, 4), 10) + (mi === 11 ? 1 : 0);
  const firstOfNext = new Date(nextYear, (mi + 1) % 12, 1);
  const dateLabel = getLang() === 'mn' ? `${(mi + 1) % 12 + 1}-р сарын 1, ${['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'][firstOfNext.getDay()]}` : `${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][firstOfNext.getDay()]}, 1 ${next}`;

  const { rolled, within, income } = useMemo(() => {
    const rolled = st.views.reduce((a, e) => a + Math.max(0, e.left), 0);
    const everydayBudget = st.views.filter((e) => e.group === 'Everyday').reduce((a, e) => a + e.budget, 0);
    const perDay = everydayBudget / st.today.monthDays;
    const byDay = spentByDay(st.txns, st.month);
    let within = 0;
    for (let d = 1; d <= st.today.monthDays; d += 1) if ((byDay[d] ?? 0) <= perDay) within += 1;
    const income = st.txns.filter((t) => t.type === 'income' && t.date.startsWith(st.month)).reduce((a, t) => a + t.amount, 0);
    return { rolled, within, income };
  }, [st.views, st.txns, st.month, st.today.monthDays]);

  const rta = Math.max(0, st.rta) + income;
  return (
    <ScrollView style={s.fill} contentContainerStyle={[s.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
      <Block style={{ paddingVertical: 26 }}>
        <Text style={s.date}>{dateLabel}</Text>
        <Text style={s.hero} accessibilityRole="header">{tr('{0}\nis here.', next)}</Text>
        <Text style={s.sub}>{tr('Here\'s how {0} went, and what you have to plan with now.', cur)}</Text>
      </Block>
      <Block padding={false} style={{ padding: 6, gap: 5 }}>
        <InnerCard style={s.row}><Text style={s.rowL}>{tr('Rolled over from {0}', cur)}</Text><Money value={rolled} style={s.rowV} /></InnerCard>
        <InnerCard style={s.row}><Text style={s.rowL}>Days within budget</Text><Text style={s.rowV}>{tr('{0} of {1}', within, st.today.monthDays)}</Text></InnerCard>
        <InnerCard style={s.row}><Text style={s.rowL}>New income</Text><Money value={income} style={s.rowV} /></InnerCard>
      </Block>
      <Block>
        <Text style={s.rtaL}>Ready to Assign</Text>
        <Money value={rta} style={s.rta} />
        <Text style={s.sub}>Leftovers stay in their envelopes. Only new money needs a job.</Text>
      </Block>
      <Block><Button full title={tr('Back to {0}', cur)} onPress={nav.back} /></Block>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 4 },
  date: { fontFamily: font.medium, fontSize: 15, color: colors.muted },
  hero: { fontFamily: font.medium, fontSize: 44, lineHeight: 48, letterSpacing: -1.8, color: colors.ink, marginTop: 10 },
  sub: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: colors.ink2, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 },
  rowL: { fontFamily: font.regular, fontSize: 15, color: colors.ink, flexShrink: 1 , flexShrink: 1 },
  rowV: { fontFamily: font.medium, fontSize: 17, color: colors.ink },
  rtaL: { fontFamily: font.medium, fontSize: 16, color: colors.ink },
  rta: { fontFamily: font.regular, fontSize: 48, letterSpacing: -2, color: colors.accent, marginTop: 2 },
});
