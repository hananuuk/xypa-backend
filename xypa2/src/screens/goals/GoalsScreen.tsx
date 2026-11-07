import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Money } from '../../design/Amounts';
import { Icon } from '../../design/Icon';
import { ScreenFrame } from '../../design/ScreenFrame';
import { Block, Button, IconButton, InnerCard, PillBar } from '../../design/Primitives';
import { colors, font } from '../../design/tokens';
import { behindBy, goalReached } from '../../logic/budget';
import { formatMoney } from '../../logic/money';
import { MONTH_NAMES, monthName } from '../../store/calendar';
import { useStore } from '../../store/store';
import { useNav } from '../../nav';

const byLabel = (by: string) => `${MONTH_NAMES[parseInt(by.slice(5, 7), 10) - 1].slice(0, 3)} ${by.slice(0, 4)}`;

export function GoalsScreen() {
  const st = useStore();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const total = st.goals.reduce((a, g) => a + g.saved, 0);
  return (
    <ScrollView style={s.fill} contentContainerStyle={[s.content, { paddingTop: insets.top + 8, paddingBottom: 130 }]} showsVerticalScrollIndicator={false}>
      <PillBar left={<Text style={s.title} accessibilityRole="header">Goals</Text>}
        right={<IconButton label="New goal" onPress={() => nav.openSheet({ name: 'newGoal' })}><Icon name="plus" size={20} /></IconButton>} />
      <Block>
        <Text style={s.label}>Saved in goals</Text>
        <Money value={total} style={s.hero} />
      </Block>
      <Block padding={false} style={{ padding: 6, gap: 5 }}>
        {st.goals.length === 0 ? <Text style={[s.label, { padding: 12 }]}>No goals yet. Tap + to add one.</Text> : st.goals.map((g) => {
          const reached = goalReached(g);
          const behind = behindBy(g, st.month);
          return (
            <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={`${g.name}, ${formatMoney(g.saved)} of ${formatMoney(g.target)}${reached ? ', goal reached' : behind ? ', behind this month' : ''}`}
              onPress={() => nav.push({ name: 'goal', id: g.id })}>
              <InnerCard style={{ gap: 8 }}>
                <View style={s.row}><Text style={s.name}>{g.name}</Text><Money value={g.saved} style={s.amount} /></View>
                <Text style={s.label}>of <Money value={g.target} /> by {byLabel(g.by)}</Text>
                <View style={s.track}><View style={[s.fillBar, { width: `${Math.min(100, (g.saved / g.target) * 100)}%` }]} /></View>
                {reached ? <Text style={s.ok}>Goal reached</Text> : behind > 0 ? (
                  <View style={s.row}><Text style={[s.label, { color: colors.accentInk }]}>Behind this month</Text>
                    <Button small title="Add money" onPress={() => nav.openSheet({ name: 'addGoalMoney', id: g.id })} /></View>
                ) : <Text style={s.ok}>On track</Text>}
              </InnerCard>
            </Pressable>
          );
        })}
      </Block>
    </ScrollView>
  );
}

export function GoalDetail({ id }: { id: string }) {
  const st = useStore();
  const nav = useNav();
  const g = st.goals.find((x) => x.id === id);
  if (!g) return null;
  const behind = behindBy(g, st.month);
  const reached = goalReached(g);
  return (
    <ScreenFrame title={g.name} onBack={nav.back}>
      <Block>
        <Text style={s.label}>Saved</Text>
        <Money value={g.saved} style={s.hero} />
        <Text style={s.label}>of <Money value={g.target} /> by {byLabel(g.by)}</Text>
        <View style={[s.track, { marginTop: 12 }]}><View style={[s.fillBar, { width: `${Math.min(100, (g.saved / g.target) * 100)}%` }]} /></View>
      </Block>
      {reached ? <Block><Text style={s.ok}>Goal reached</Text></Block>
        : behind > 0 ? (
          <View style={s.warn} accessibilityRole="alert">
            <Text style={s.warnText}>Add {formatMoney(behind)} in {monthName(st.month)} to stay on track for {byLabel(g.by)}.</Text>
            <Button title="Add money" onPress={() => nav.openSheet({ name: 'addGoalMoney', id })} style={{ alignSelf: 'flex-start', marginTop: 10 }} />
          </View>
        ) : <Block><Text style={s.ok}>On track</Text></Block>}
      <Block>
        <Text style={s.eyebrow}>This month</Text>
        <View style={s.row}><Text style={s.name}>Added</Text><Money value={g.addedThisMonth} style={s.amount} /></View>
      </Block>
      <Button title="Delete goal" variant="outline" onPress={() => nav.openSheet({ name: 'confirmDeleteGoal', id })} style={{ alignSelf: 'center', marginTop: 12 }} />
    </ScreenFrame>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 4 },
  title: { fontFamily: font.medium, fontSize: 22, color: colors.ink },
  label: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  hero: { fontFamily: font.regular, fontSize: 40, letterSpacing: -1.6, color: colors.ink, marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontFamily: font.regular, fontSize: 16, color: colors.ink },
  amount: { fontFamily: font.medium, fontSize: 18, color: colors.ink },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.gaugeTrack, overflow: 'hidden' },
  fillBar: { height: 6, borderRadius: 3, backgroundColor: colors.gaugeFill },
  ok: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  warn: { backgroundColor: colors.accentSoft, borderRadius: 24, padding: 18 },
  warnText: { fontFamily: font.regular, fontSize: 15, color: colors.accentInk, lineHeight: 22 },
  eyebrow: { fontFamily: font.regular, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted, marginBottom: 8 },
});
