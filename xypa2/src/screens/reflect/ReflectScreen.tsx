import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Money } from '../../design/Amounts';
import { Segmented } from '../../design/Fields';
import { Block, PillBar } from '../../design/Primitives';
import { colors, font } from '../../design/tokens';
import { spentByDay } from '../../logic/budget';
import { formatMoney } from '../../logic/money';
import { monthName } from '../../store/calendar';
import { useStore } from '../../store/store';
import { useNav } from '../../nav';

type Tab = 'breakdown' | 'calendar' | 'report';

export function ReflectScreen() {
  const st = useStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('breakdown');
  return (
    <ScrollView style={s.fill} contentContainerStyle={[s.content, { paddingTop: insets.top + 8, paddingBottom: 130 }]} showsVerticalScrollIndicator={false}>
      <PillBar left={<Text style={s.title} accessibilityRole="header">Reflect</Text>} right={<Text style={s.label}>{monthName(st.month)}</Text>} />
      <Block><Segmented value={tab} onChange={setTab} options={[{ value: 'breakdown', label: 'Breakdown' }, { value: 'calendar', label: 'Calendar' }, { value: 'report', label: 'Report' }]} /></Block>
      {tab === 'breakdown' ? <Breakdown /> : tab === 'calendar' ? <CalendarView /> : <Report />}
    </ScrollView>
  );
}

function Breakdown() {
  const st = useStore();
  const rows = st.views.filter((e) => e.spent > 0).sort((a, b) => b.spent - a.spent);
  const total = rows.reduce((a, e) => a + e.spent, 0);
  const max = rows[0]?.spent ?? 1;
  return (
    <Block>
      <Text style={s.label}>Spent this month</Text>
      <Money value={total} style={s.hero} />
      <View style={{ gap: 14, marginTop: 14 }}>
        {rows.length === 0 ? <Text style={s.label}>Nothing spent yet.</Text> : rows.map((e) => (
          <View key={e.id} accessible accessibilityLabel={`${e.name}, ${formatMoney(e.spent)}`}>
            <View style={s.row}><View style={s.nameRow}><View style={[s.dot, { backgroundColor: e.color }]} /><Text style={s.name}>{e.name}</Text></View><Money value={e.spent} style={s.amt} /></View>
            <View style={s.track}><View style={[s.bar, { width: `${(e.spent / max) * 100}%`, backgroundColor: e.color }]} /></View>
          </View>
        ))}
      </View>
    </Block>
  );
}

function CalendarView() {
  const st = useStore();
  const nav = useNav();
  const byDay = spentByDay(st.txns, st.month);
  const everydayBudget = st.views.filter((e) => e.group === 'Everyday').reduce((a, e) => a + e.budget, 0);
  const perDay = everydayBudget / st.today.monthDays;
  const first = (new Date(parseInt(st.month.slice(0, 4), 10), parseInt(st.month.slice(5, 7), 10) - 1, 1).getDay() + 6) % 7;
  const cells = [...Array(first).fill(0), ...Array.from({ length: st.today.monthDays }, (_, i) => i + 1)];
  return (
    <Block>
      <View style={s.weekRow}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => <Text key={i} style={s.weekL}>{l}</Text>)}</View>
      <View style={s.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={s.cell} />;
          const spent = byDay[d] ?? 0;
          const future = d > st.today.day;
          const over = !future && spent > perDay;
          const isToday = d === st.today.day;
          return (
            <Pressable key={i} style={s.cell} disabled={future} accessibilityRole="button"
              accessibilityLabel={`Day ${d}, ${future ? 'upcoming' : spent === 0 ? 'nothing spent' : `${formatMoney(spent)} spent, ${over ? 'over' : 'within'} budget`}`}
              onPress={() => nav.openSheet({ name: 'day', day: d })}>
              <View style={[s.day, isToday && s.today, !future && !over && spent > 0 && s.within, over && s.over]}>
                <Text style={[s.dayText, (over || isToday) && { color: colors.white }, future && { color: colors.line2 }]}>{d}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={s.legend}>
        <Legend color={colors.gaugeFill} text="Within budget" /><Legend color={colors.accent} text="Over budget" /><Legend color={colors.ink} text="Today" />
      </View>
    </Block>
  );
}
const Legend = ({ color, text }: { color: string; text: string }) => (<View style={s.legendItem}><View style={[s.dot, { backgroundColor: color }]} /><Text style={s.label}>{text}</Text></View>);

function Report() {
  const st = useStore();
  const spent = st.txns.filter((t) => t.type === 'spend' && t.date.startsWith(st.month)).reduce((a, t) => a + t.amount, 0);
  const income = st.txns.filter((t) => t.type === 'income' && t.date.startsWith(st.month)).reduce((a, t) => a + t.amount, 0);
  return (
    <Block>
      <Text style={s.label}>This month so far</Text>
      <View style={[s.track, { height: 90, justifyContent: 'flex-end', backgroundColor: 'transparent', marginTop: 10 }]}>
        <View style={{ width: 54, height: 90, borderRadius: 10, backgroundColor: colors.accent }} accessibilityLabel={`${monthName(st.month)}, ${formatMoney(spent)} spent`} />
      </View>
      <Text style={[s.label, { marginTop: 6 }]}>Earlier months will appear here as you finish them.</Text>
      <View style={{ gap: 12, marginTop: 16 }}>
        <View style={s.row}><Text style={s.name}>Income</Text><Money value={income} style={s.amt} /></View>
        <View style={s.row}><Text style={s.name}>Spent</Text><Money value={spent} style={s.amt} /></View>
        <View style={s.row}><Text style={s.name}>Kept</Text><Money value={income - spent} style={s.amt} /></View>
      </View>
    </Block>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 4 },
  title: { fontFamily: font.medium, fontSize: 22, color: colors.ink },
  label: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  hero: { fontFamily: font.regular, fontSize: 40, letterSpacing: -1.6, color: colors.ink, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  name: { fontFamily: font.regular, fontSize: 15, color: colors.ink },
  amt: { fontFamily: font.medium, fontSize: 15, color: colors.ink },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.gaugeTrack, marginTop: 6, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekL: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: font.regular, fontSize: 12, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: 48, alignItems: 'center', justifyContent: 'center' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  within: { backgroundColor: colors.gaugeTrack },
  over: { backgroundColor: colors.accent },
  today: { backgroundColor: colors.ink },
  dayText: { fontFamily: font.regular, fontSize: 14, color: colors.ink, fontVariant: ['tabular-nums'] },
  legend: { flexDirection: 'row', gap: 14, marginTop: 10, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
