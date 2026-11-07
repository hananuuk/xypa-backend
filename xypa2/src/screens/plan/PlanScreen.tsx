import React, { useMemo } from 'react';
import { tr } from '../../i18n';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../design/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Money, useAmountsHidden } from '../../design/Amounts';
import { Icon } from '../../design/Icon';
import { Block, Button, IconButton, PillBar } from '../../design/Primitives';
import { colors, font, radius } from '../../design/tokens';
import { groupLeft } from '../../logic/budget';
import { formatMoney } from '../../logic/money';
import { monthName } from '../../store/calendar';
import { HomeCard, useStore } from '../../store/store';
import { useNav } from '../../nav';
import { t } from '../../i18n/en';
import { EnvelopeCard } from './EnvelopeCard';
import { FirstWeekCard } from './FirstWeekCard';
import { SafeToSpendBlock } from './SafeToSpendBlock';

export function PlanScreen() {
  const st = useStore();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const hidden = useAmountsHidden();

  const everydayShare = useMemo(() => {
    const ev = st.views.filter((e) => e.group === 'Everyday');
    const budget = ev.reduce((a, e) => a + e.budget, 0);
    return budget > 0 ? ev.reduce((a, e) => a + e.spent, 0) / budget : 0;
  }, [st.views]);

  const checklistDone = Object.values(st.checklist).every(Boolean);
  const showChecklist = !st.homeHidden.notes && !(checklistDone && st.homeHidden.notes);

  const startTask = (k: keyof typeof st.checklist) => {
    if (k === 'sort') nav.push({ name: 'review' });
    else if (k === 'cover') {
      const over = st.views.find((e) => e.left < 0);
      if (over) nav.openSheet({ name: 'cover', id: over.id });
    } else if (k === 'check') nav.openSheet({ name: 'safeExplain' });
    else nav.push({ name: 'assign' });
  };

  const cards: Record<HomeCard, React.ReactNode> = {
    notes: showChecklist ? (
      <FirstWeekCard key="notes" checklist={st.checklist} onStart={startTask}
        onHide={() => st.setHomeLayout(st.homeOrder, { ...st.homeHidden, notes: true })} />
    ) : null,
    rta: <ReadyToAssign key="rta" />,
    safe: (
      <SafeToSpendBlock key="safe" safe={st.safe} today={st.today} everydayShare={everydayShare}
        onExplain={() => nav.openSheet({ name: 'safeExplain' })} onChecked={() => st.markChecklist('check')} />
    ),
    envs: <EnvelopesBlock key="envs" />,
  };

  return (
    <ScrollView style={s.fill} contentContainerStyle={[s.content, { paddingTop: insets.top + 8, paddingBottom: 130 }]} showsVerticalScrollIndicator={false}>
      <PillBar
        left={
          <Pressable accessibilityRole="button" accessibilityLabel={tr('{0}, choose month', monthName(st.month))} onPress={() => nav.openSheet({ name: 'monthPicker' })} style={s.month} hitSlop={8}>
            <Text style={s.monthText}>{monthName(st.month)}</Text>
            <Icon name="chevronDown" size={18} />
          </Pressable>
        }
        right={
          <>
            <IconButton label={hidden ? t.plan.showAmounts : t.plan.hideAmounts} onPress={() => st.setHideAmounts(!st.hideAmounts)}>
              <Icon name={hidden ? 'eyeOff' : 'eye'} size={20} />
            </IconButton>
            {st.unsorted.length > 0 ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`${t.plan.toReview}, ${st.unsorted.length}`} onPress={() => nav.push({ name: 'review' })} style={s.review}>
                <View style={s.badge}><Text style={s.badgeText}>{st.unsorted.length}</Text></View>
                <Text style={s.reviewText}>{t.plan.toReview}</Text>
              </Pressable>
            ) : null}
          </>
        }
      />
      {st.homeOrder.map((id) => (st.homeHidden[id] && id !== 'envs' ? null : (
        <Pressable key={id} delayLongPress={600} onLongPress={() => nav.push({ name: 'editHome' })} accessible={false}>{cards[id]}</Pressable>
      )))}
      <Pressable accessibilityRole="button" accessibilityLabel={tr('Customize home')} onPress={() => nav.push({ name: 'editHome' })} style={s.customize}>
        <Text style={s.customizeText}>Customize home</Text>
      </Pressable>
    </ScrollView>
  );
}

function ReadyToAssign() {
  const st = useStore();
  const nav = useNav();
  const allAssigned = st.rta === 0;
  return (
    <Block>
      {allAssigned ? (
        <View style={s.rtaRow}>
          <View style={s.rtaLeft}>
            <View style={s.checkCircle}><Icon name="check" size={18} color={colors.white} /></View>
            <View>
              <Text style={s.rtaDone}>{t.plan.allAssigned}</Text>
              <Text style={s.label}>{t.plan.everyTogrogHasAJob}</Text>
            </View>
          </View>
          <Button title={t.plan.adjust} onPress={() => nav.push({ name: 'assign' })} />
        </View>
      ) : (
        <>
          <Text style={s.label}>{t.plan.readyToAssign}</Text>
          <View style={s.rtaRow}>
            <Money value={st.rta} style={[st.rta >= 10000000 ? s.heroSmall : s.hero, st.rta < 0 && { color: colors.accent }]} />
            <Button title={t.plan.assign} onPress={() => nav.push({ name: 'assign' })} />
          </View>
        </>
      )}
    </Block>
  );
}

function EnvelopesBlock() {
  const st = useStore();
  const nav = useNav();
  const hidden = useAmountsHidden();
  const groups = useMemo(() => Array.from(new Set(st.views.map((e) => e.group))), [st.views]);
  const grid = st.envView === 'grid';

  return (
    <Block padding={false} style={s.envBlock}>
      <View style={s.envHeader}>
        <Text style={s.envTitle}>{t.plan.envelopes}</Text>
        <View style={s.toggle} accessibilityRole="radiogroup">
          {(['list', 'grid'] as const).map((v) => (
            <Pressable key={v} accessibilityRole="radio" accessibilityLabel={v === 'list' ? 'List view' : 'Grid view'} accessibilityState={{ selected: st.envView === v }}
              onPress={() => st.setEnvView(v)} style={[s.toggleBtn, st.envView === v && s.toggleOn]}>
              <Icon name={v === 'list' ? 'list' : 'grid'} size={18} color={st.envView === v ? colors.white : colors.ink} />
            </Pressable>
          ))}
        </View>
      </View>

      {groups.map((g) => (
        <View key={g}>
          <View style={s.groupRow}>
            <Text style={s.groupLabel}>{g}</Text>
            <Text style={s.groupTotal}>{tr('{0} left', formatMoney(groupLeft(st.views, g), { hidden }))}</Text>
          </View>
          <View style={grid ? s.gridWrap : s.listWrap}>
            {st.views.filter((e) => e.group === g).map((e) => (
              <View key={e.id} style={grid ? s.gridCell : undefined}>
                <EnvelopeCard e={e} grid={grid} onPress={() => nav.push({ name: 'envelope', id: e.id })} onCover={() => nav.openSheet({ name: 'cover', id: e.id })} />
              </View>
            ))}
          </View>
        </View>
      ))}

      <Pressable accessibilityRole="button" accessibilityLabel={t.plan.newEnvelope} onPress={() => nav.openSheet({ name: 'newEnvelope' })} style={s.newEnv}>
        <Icon name="plus" size={18} />
        <Text style={s.newEnvText}>{t.plan.newEnvelope}</Text>
      </Pressable>
    </Block>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 4 },
  customize: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 8 },
  customizeText: { fontFamily: font.regular, fontSize: 14, color: colors.muted },
  month: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  monthText: { fontFamily: font.regular, fontSize: 17, color: colors.ink },
  review: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: 999, height: 40, paddingLeft: 6, paddingRight: 14 },
  badge: { minWidth: 26, height: 26, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: font.medium, fontSize: 13, color: colors.accent },
  reviewText: { fontFamily: font.medium, fontSize: 14, color: colors.white },
  label: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  hero: { fontFamily: font.regular, fontSize: 44, letterSpacing: -1.8, color: colors.ink },
  heroSmall: { fontFamily: font.regular, fontSize: 34, letterSpacing: -1.4, color: colors.ink },
  rtaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  rtaLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rtaDone: { fontFamily: font.regular, fontSize: 20, color: colors.ink },
  checkCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  envBlock: { padding: 6 },
  envHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 10, paddingBottom: 4 },
  envTitle: { fontFamily: font.regular, fontSize: 19, color: colors.ink },
  toggle: { flexDirection: 'row', backgroundColor: colors.chip, borderRadius: 999, padding: 3 },
  toggleBtn: { width: 44, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.ink },
  groupRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 14, paddingBottom: 8 },
  groupLabel: { fontFamily: font.regular, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.muted },
  groupTotal: { fontFamily: font.regular, fontSize: 13, color: colors.muted, fontVariant: ['tabular-nums'] },
  listWrap: { gap: 6 },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridCell: { width: '48.8%' },
  newEnv: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 56, marginTop: 8, borderRadius: radius.inner, borderWidth: 1.5, borderColor: colors.line2, borderStyle: 'dashed' },
  newEnvText: { fontFamily: font.regular, fontSize: 16, color: colors.ink },
});
