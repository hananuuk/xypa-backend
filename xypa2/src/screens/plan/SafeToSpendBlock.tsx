import React, { useEffect, useMemo, useRef, useState } from 'react';
import { tr } from '../../i18n';
import { AccessibilityInfo, Animated, Easing, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../design/Text';
import { Money } from '../../design/Amounts';
import { Block } from '../../design/Primitives';
import { colors, font } from '../../design/tokens';
import type { SafeToSpend } from '../../logic/budget';
import type { Today } from '../../store/calendar';
import { t } from '../../i18n/en';

type Period = 'today' | 'week' | 'month';
const periods: Period[] = ['today', 'week', 'month'];
const label: Record<Period, string> = { today: t.plan.today, week: t.plan.thisWeek, month: t.plan.thisMonth };

/**
 * Safe to spend: the whole block is the swipe area. Only the top row slides; the period bar and caption stay put
 * and redraw. Swiping loops (past Month → Today, before Today → Month). Tapping the amount explains the maths.
 * All three period bars are exactly 4px tall at the same vertical position so nothing jumps.
 */
export function SafeToSpendBlock({ safe, today, everydayShare, onExplain, onChecked }: {
  safe: SafeToSpend; today: Today; everydayShare: number; onExplain: () => void; onChecked: () => void;
}) {
  const [index, setIndex] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const redraw = useRef(new Animated.Value(1)).current;
  const reduce = useRef(false);
  const busy = useRef(false);
  const indexRef = useRef(0);

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduce.current = v; }); }, []);

  const go = (dir: 1 | -1) => {
    if (busy.current) return;
    busy.current = true;
    const next = (indexRef.current + dir + 3) % 3;
    const out = dir === 1 ? -80 : 80;
    const finish = () => { indexRef.current = next; setIndex(next); if (next !== 0) onChecked(); busy.current = false; };
    if (reduce.current) { finish(); return; }
    Animated.parallel([
      Animated.timing(x, { toValue: out, duration: 130, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(redraw, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      indexRef.current = next; setIndex(next);
      x.setValue(-out);
      Animated.parallel([
        Animated.timing(x, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(redraw, { toValue: 1, duration: 220, delay: 40, useNativeDriver: true }),
      ]).start(() => { busy.current = false; if (next !== 0) onChecked(); });
    });
  };

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_e, g) => { if (g.dx < -30) go(1); else if (g.dx > 30) go(-1); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const period = periods[index];
  const amount = safe[period];

  return (
    <Block style={s.block}>
      <View {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={`${t.plan.safeToSpend} ${label[period]}`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => go(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
        <Animated.View style={[s.row, { transform: [{ translateX: x }] }]}>
          <Text style={s.title}>{t.plan.safeToSpend} <Text style={s.titleStrong}>{label[period]}</Text></Text>
          <Pressable accessibilityRole="button" accessibilityLabel={tr('{0}: explain', label[period])} onPress={() => { onExplain(); onChecked(); }} hitSlop={10}>
            <Money value={amount} style={s.amount} />
          </Pressable>
        </Animated.View>

        <Animated.View style={{ opacity: redraw, transform: [{ translateY: redraw.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }] }}>
          <View style={s.barArea}>
            {period === 'today' && <DayDashes today={today} />}
            {period === 'week' && <WeekBar today={today} />}
            {period === 'month' && <MonthBar today={today} share={everydayShare} />}
          </View>
          <Text style={s.caption}>{caption(period, today)}</Text>
        </Animated.View>
      </View>
      <View style={s.dots} accessibilityRole="tablist">
        {periods.map((p, i) => (
          <Pressable key={p} accessibilityRole="tab" accessibilityLabel={label[p]} accessibilityState={{ selected: i === index }}
            hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }} onPress={() => { if (i !== index) go(i > index ? 1 : -1); }}>
            <View style={[s.dot, i === index && s.dotOn]} />
          </Pressable>
        ))}
      </View>
    </Block>
  );
}

function caption(p: Period, today: Today) {
  if (p === 'today') return t.plan.dayOf(today.day, today.monthDays, today.monthDays - today.day);
  if (p === 'week') return tr('Rest of the week · {0} days', Math.min(7 - today.weekday, Math.max(1, today.monthDays - today.day + 1)));
  return tr('{0} days left this month', today.monthDays - today.day);
}

/** One dash per day of the month. Past days ink, today accent, future days line. */
function DayDashes({ today }: { today: Today }) {
  return (
    <View style={s.dashes}>
      {Array.from({ length: today.monthDays }, (_, i) => (
        <View key={i} style={[s.dash, { backgroundColor: i + 1 < today.day ? colors.ink : i + 1 === today.day ? colors.accent : colors.line }]} />
      ))}
    </View>
  );
}

function WeekBar({ today }: { today: Today }) {
  const letters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <View>
      <View style={s.weekSegs}>
        {letters.map((_, i) => <View key={i} style={[s.seg, { backgroundColor: i < today.weekday ? colors.ink : i === today.weekday ? colors.accent : colors.line }]} />)}
      </View>
      <View style={s.weekLabels}>{letters.map((l, i) => <Text key={i} style={s.weekLabel}>{l}</Text>)}</View>
    </View>
  );
}

/** One bar: share of everyday budget spent, with a small accent marker for today. */
function MonthBar({ today, share }: { today: Today; share: number }) {
  const todayPos = `${Math.round(((today.day - 0.5) / today.monthDays) * 100)}%` as const;
  return (
    <View style={s.monthTrack}>
      <View style={[s.monthFill, { width: `${Math.round(Math.max(0, Math.min(1, share)) * 100)}%` }]} />
      <View style={[s.marker, { left: todayPos }]} />
    </View>
  );
}

const s = StyleSheet.create({
  block: { paddingTop: 16, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  title: { fontFamily: font.regular, fontSize: 16, color: colors.ink },
  titleStrong: { fontFamily: font.medium },
  amount: { fontFamily: font.regular, fontSize: 26, color: colors.accent, letterSpacing: -0.8 },
  barArea: { height: 22, justifyContent: 'center', marginTop: 12 },
  dashes: { flexDirection: 'row', gap: 2, height: 4 },
  dash: { flex: 1, height: 4, borderRadius: 2 },
  weekSegs: { flexDirection: 'row', gap: 4, height: 4 },
  seg: { flex: 1, height: 4, borderRadius: 2 },
  weekLabels: { position: 'absolute', top: 8, left: 0, right: 0, flexDirection: 'row' },
  weekLabel: { flex: 1, textAlign: 'center', fontFamily: font.regular, fontSize: 9, color: colors.muted },
  monthTrack: { height: 4, borderRadius: 2, backgroundColor: colors.line, justifyContent: 'center' },
  monthFill: { height: 4, borderRadius: 2, backgroundColor: colors.ink },
  marker: { position: 'absolute', width: 4, height: 10, borderRadius: 2, backgroundColor: colors.accent, top: -3 },
  caption: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 10 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line2 },
  dotOn: { width: 20, backgroundColor: colors.ink },
});
