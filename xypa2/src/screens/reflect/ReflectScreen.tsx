import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Money } from '../../design/Amounts';
import { Segmented } from '../../design/Fields';
import { Block, PillBar } from '../../design/Primitives';
import { colors, font } from '../../design/tokens';
import { spentByDay, viewEnvelopes } from '../../logic/budget';
import { Icon } from '../../design/Icon';
import { formatMoney } from '../../logic/money';
import { monthName } from '../../store/calendar';
import { useStore } from '../../store/store';
import { useNav } from '../../nav';
import { Button } from '../../design/Primitives';

// Ask xypa is built but paused until there is an API key to power it.
const ASK_ENABLED = false;
type Tab = 'breakdown' | 'calendar' | 'report';

const shift = (m: string, d: number) => { const dt = new Date(parseInt(m.slice(0, 4), 10), parseInt(m.slice(5, 7), 10) - 1 + d, 1); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; };
const daysIn = (m: string) => new Date(parseInt(m.slice(0, 4), 10), parseInt(m.slice(5, 7), 10), 0).getDate();
const yearOf = (m: string) => m.slice(0, 4);

export function ReflectScreen() {
  const st = useStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('breakdown');
  const [month, setMonth] = useState(st.today.month);
  const earliest = st.txns.reduce((a, t) => (t.date.slice(0, 7) < a ? t.date.slice(0, 7) : a), st.today.month);
  const canPrev = month > earliest;
  const canNext = month < st.today.month;
  const label = `${monthName(month)}${yearOf(month) !== yearOf(st.today.month) ? ' ' + yearOf(month) : ''}`;
  const nav = useNav();
  const picker = (
    <View style={s.picker}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous month" disabled={!canPrev} hitSlop={10} onPress={() => setMonth(shift(month, -1))} style={[s.arrow, !canPrev && { opacity: 0.25 }]}><Icon name="chevronLeft" size={18} color={colors.ink} /></Pressable>
      <Text style={s.label} accessibilityLiveRegion="polite">{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Next month" disabled={!canNext} hitSlop={10} onPress={() => setMonth(shift(month, 1))} style={[s.arrow, !canNext && { opacity: 0.25 }]}><Icon name="chevronRight" size={18} color={colors.ink} /></Pressable>
    </View>
  );
  return (
    <ScrollView style={s.fill} contentContainerStyle={[s.content, { paddingTop: insets.top + 8, paddingBottom: 130 }]} showsVerticalScrollIndicator={false}>
      <PillBar left={<Text style={s.title} accessibilityRole="header">Reflect</Text>} right={picker} />
      <Block><Segmented value={tab} onChange={setTab} options={[{ value: 'breakdown', label: 'Breakdown' }, { value: 'calendar', label: 'Calendar' }, { value: 'report', label: 'Report' }]} /></Block>
      {ASK_ENABLED && st.pro !== false ? <Block><Button title="Ask xypa" variant="chip" onPress={() => nav.push({ name: 'ask' })} accessibilityLabel="Ask xypa about your spending" /></Block> : null}
      {tab === 'breakdown' ? <Breakdown month={month} /> : tab === 'calendar' ? <CalendarView month={month} /> : <Report month={month} />}
    </ScrollView>
  );
}

function Breakdown({ month }: { month: string }) {
  const st = useStore();
  const nav = useNav();
  const rows = viewEnvelopes(st.envelopes, st.txns, month).filter((e) => e.spent > 0).sort((a, b) => b.spent - a.spent);
  const total = rows.reduce((a, e) => a + e.spent, 0);
  const max = rows[0]?.spent ?? 1;
  const byM: Record<string, { total: number; count: number }> = {};
  for (const t of st.txns) if (t.type === 'spend' && t.date.startsWith(month)) { const e = (byM[t.merchant] ??= { total: 0, count: 0 }); e.total += t.amount; e.count += 1; }
  const merchants = Object.entries(byM).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total).slice(0, 5);
  return (
    <Block>
      <Text style={s.label}>{month === st.today.month ? 'Spent this month' : `Spent in ${monthName(month)}`}</Text>
      <Money value={total} style={s.hero} />
      <View style={{ gap: 14, marginTop: 14 }}>
        {rows.length === 0 ? <Text style={s.label}>Nothing spent.</Text> : rows.map((e) => (
          <Pressable key={e.id} accessibilityRole="button" accessibilityLabel={`${e.name}, ${formatMoney(e.spent)}. See transactions`} onPress={() => nav.push({ name: 'txnList', title: e.name, month, envelopeId: e.id })}>
            <View style={s.row}><View style={s.nameRow}><View style={[s.dot, { backgroundColor: e.color }]} /><Text style={s.name}>{e.name}</Text></View><Money value={e.spent} style={s.amt} /></View>
            <View style={s.track}><View style={[s.bar, { width: `${(e.spent / max) * 100}%`, backgroundColor: e.color }]} /></View>
          </Pressable>
        ))}
      </View>
      {merchants.length ? (
        <View style={{ marginTop: 22, gap: 12 }}>
          <Text style={s.label}>Top merchants</Text>
          {merchants.map((m, i) => (
            <Pressable key={m.name} style={s.row} accessibilityRole="button" onPress={() => nav.push({ name: 'txnList', title: m.name, month, merchant: m.name })} accessibilityLabel={`${i + 1}. ${m.name}, ${formatMoney(m.total)}, ${m.count} ${m.count === 1 ? 'time' : 'times'}. See transactions`}>
              <View style={{ flex: 1 }}><Text style={s.name} numberOfLines={1}>{i + 1}. {m.name}</Text><Text style={s.label}>{m.count} {m.count === 1 ? 'purchase' : 'purchases'}</Text></View>
              <Money value={m.total} style={s.amt} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </Block>
  );
}

function CalendarView({ month }: { month: string }) {
  const st = useStore();
  const nav = useNav();
  const byDay = spentByDay(st.txns, month);
  const current = month === st.today.month;
  const monthDays = daysIn(month);
  const everydayBudget = st.views.filter((e) => e.group === 'Everyday').reduce((a, e) => a + e.budget, 0);
  const perDay = everydayBudget / monthDays;
  const first = (new Date(parseInt(month.slice(0, 4), 10), parseInt(month.slice(5, 7), 10) - 1, 1).getDay() + 6) % 7;
  const cells = [...Array(first).fill(0), ...Array.from({ length: monthDays }, (_, i) => i + 1)];
  return (
    <Block>
      <View style={s.weekRow}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => <Text key={i} style={s.weekL}>{l}</Text>)}</View>
      <View style={s.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={s.cell} />;
          const spent = byDay[d] ?? 0;
          const future = current && d > st.today.day;
          const over = !future && spent > perDay;
          const isToday = current && d === st.today.day;
          return (
            <Pressable key={i} style={s.cell} disabled={future || !current} accessibilityRole="button"
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

function Report({ month }: { month: string }) {
  const st = useStore();
  const sum = (m: string, type: 'spend' | 'income') => st.txns.filter((t) => t.type === type && t.date.startsWith(m)).reduce((a, t) => a + t.amount, 0);
  const months = [-4, -3, -2, -1, 0].map((d) => shift(month, d));
  const vals = months.map((m) => sum(m, 'spend'));
  const max = Math.max(...vals, 1);
  const active = vals.filter((v) => v > 0);
  const avg = active.length ? Math.round(active.reduce((a, v) => a + v, 0) / active.length) : 0;
  const spent = vals[4];
  const income = sum(month, 'income');
  return (
    <Block>
      <Text style={s.label}>Average monthly spending</Text>
      <Money value={avg} style={s.hero} />
      <View style={s.chart}>
        {months.map((m, i) => (
          <View key={m} style={s.col} accessible accessibilityLabel={`${monthName(m)}, ${formatMoney(vals[i])} spent`}>
            <View style={{ height: 90, justifyContent: 'flex-end' }}>
              <View style={{ width: 34, height: Math.max(4, (vals[i] / max) * 90), borderRadius: 8, backgroundColor: i === 4 ? colors.accent : colors.gaugeTrack }} />
            </View>
            <Text style={s.label}>{monthName(m).slice(0, 3)}</Text>
          </View>
        ))}
      </View>
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
  picker: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 },
  col: { alignItems: 'center', gap: 6 },
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
