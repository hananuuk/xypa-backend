import { LinearGradient } from 'expo-linear-gradient';
import { tr } from '../../i18n';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../design/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../../design/Icon';
import { PillBar } from '../../design/Primitives';
import { colors, font, radius } from '../../design/tokens';
import { HomeCard, useStore } from '../../store/store';
import { useNav } from '../../nav';

const DEFAULT: HomeCard[] = ['notes', 'rta', 'safe', 'envs'];
const LABEL: Record<HomeCard, string> = { notes: 'First week & tips', rta: 'Ready to Assign', safe: 'Safe to spend', envs: 'Envelopes' };
/** Fixed heights keep drag maths simple (placeholders never hold real data). */
const HEIGHT: Record<HomeCard, number> = { notes: 150, rta: 104, safe: 112, envs: 176 };
const GAP = 8;

function Skeleton({ id }: { id: HomeCard }) {
  switch (id) {
    case 'notes':
      return (
        <LinearGradient colors={['#F4F1EB', '#EDE6F7', '#F7D4DD']} start={{ x: 0.1, y: 0.2 }} end={{ x: 1, y: 1 }} style={s.notes}>
          <View style={[s.bar, { width: 120, backgroundColor: colors.white }]} />
          <View style={[s.pill, { width: 62, backgroundColor: colors.ink }]} />
          <View style={s.segs}>{[colors.ink, colors.white, colors.white, colors.white].map((c, i) => <View key={i} style={[s.seg, { backgroundColor: c }]} />)}</View>
        </LinearGradient>
      );
    case 'rta':
      return (
        <View style={s.rtaRow}>
          <View style={[s.bar, { width: 175, height: 28, backgroundColor: colors.gaugeTrack }]} />
          <View style={[s.pill, { width: 70, height: 30, backgroundColor: colors.ink }]} />
        </View>
      );
    case 'safe':
      return (
        <View style={{ gap: 10 }}>
          <View style={s.rtaRow}>
            <View style={[s.bar, { width: 120, backgroundColor: colors.gaugeTrack }]} />
            <View style={[s.bar, { width: 85, height: 16, backgroundColor: '#F2C9B8' }]} />
          </View>
          <View style={s.segs}>{Array.from({ length: 16 }, (_, i) => <View key={i} style={[s.tick, { backgroundColor: i < 3 ? colors.ink : colors.gaugeTrack }]} />)}</View>
          <View style={s.dots}><View style={[s.dot, { width: 16, backgroundColor: colors.ink }]} /><View style={s.dot} /><View style={s.dot} /></View>
        </View>
      );
    case 'envs':
      return (
        <View style={{ gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={s.envRow}>
              <View style={s.envDot} /><View style={[s.bar, { width: 105, backgroundColor: colors.line }]} /><View style={{ flex: 1 }} /><View style={[s.bar, { width: 60, backgroundColor: colors.line }]} />
            </View>
          ))}
        </View>
      );
  }
}

function Card({ id, removable, onRemove, wiggle }: { id: HomeCard; removable: boolean; onRemove: () => void; wiggle: Animated.AnimatedInterpolation<string> | null }) {
  return (
    <Animated.View style={[s.card, { height: HEIGHT[id] }, wiggle ? { transform: [{ rotate: wiggle }] } : null]}>
      <Text style={s.cardLabel}>{LABEL[id]}</Text>
      <View style={{ marginTop: 10 }}><Skeleton id={id} /></View>
      {removable ? (
        <Pressable accessibilityRole="button" accessibilityLabel={tr('Remove {0}', LABEL[id])} onPress={onRemove} hitSlop={6} style={s.x}>
          <Icon name="close" size={14} color={colors.white} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

export function EditHomeScreen() {
  const st = useStore();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const [reduce, setReduce] = useState(false);
  const wig = useRef(new Animated.Value(0)).current;
  const [drag, setDrag] = useState<{ id: HomeCard; to: number } | null>(null);
  const dy = useRef(new Animated.Value(0)).current;

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {}); }, []);
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(wig, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(wig, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduce, wig]);
  const rotate = reduce ? null : wig.interpolate({ inputRange: [0, 1], outputRange: ['-0.5deg', '0.5deg'] });

  const visible = useMemo(() => st.homeOrder.filter((id) => id === 'envs' || !st.homeHidden[id]), [st.homeOrder, st.homeHidden]);
  const removed = DEFAULT.filter((id) => st.homeHidden[id] && id !== 'envs');

  const commit = (nextVisible: HomeCard[]) => {
    const hiddenIds = st.homeOrder.filter((id) => !nextVisible.includes(id));
    st.setHomeLayout([...nextVisible, ...hiddenIds], st.homeHidden);
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= visible.length || to === from) return;
    const next = [...visible];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    commit(next);
    AccessibilityInfo.announceForAccessibility(tr('{0} moved to position {1} of {2}', LABEL[m], to + 1, next.length));
  };
  const remove = (id: HomeCard) => st.setHomeLayout(st.homeOrder, { ...st.homeHidden, [id]: true });
  const add = (id: HomeCard) => st.setHomeLayout([...st.homeOrder.filter((x) => x !== id), id], { ...st.homeHidden, [id]: false });
  const reset = () => st.setHomeLayout(DEFAULT, {});

  const tops = useMemo(() => { let y = 0; return visible.map((id) => { const t = y; y += HEIGHT[id] + GAP; return t; }); }, [visible]);

  const targetIndex = (i: number, d: number) => {
    const center = tops[i] + HEIGHT[visible[i]] / 2 + d;
    let n = 0;
    visible.forEach((id, k) => { if (k !== i && tops[k] + HEIGHT[id] / 2 < center) n += 1; });
    return n;
  };

  const rows = visible.map((id, i) => {
    const pan = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { dy.setValue(0); setDrag({ id, to: i }); },
      onPanResponderMove: (_, g) => { dy.setValue(g.dy); const to = targetIndex(i, g.dy); setDrag((d) => (d && d.to !== to ? { id, to } : d)); },
      onPanResponderRelease: (_, g) => { const to = targetIndex(i, g.dy); setDrag(null); dy.setValue(0); move(i, to); },
      onPanResponderTerminate: () => { setDrag(null); dy.setValue(0); },
    });
    const dragging = drag?.id === id;
    let shift = 0;
    if (drag && !dragging) {
      const from = visible.indexOf(drag.id);
      if (from < drag.to && i > from && i <= drag.to) shift = -(HEIGHT[drag.id] + GAP);
      if (from > drag.to && i < from && i >= drag.to) shift = HEIGHT[drag.id] + GAP;
    }
    return (
      <Animated.View key={id} {...pan.panHandlers}
        accessible accessibilityLabel={tr('{0}, position {1} of {2}', LABEL[id], i + 1, visible.length)}
        accessibilityActions={[{ name: 'increment', label: 'Move down' }, { name: 'decrement', label: 'Move up' }]}
        onAccessibilityAction={(e) => move(i, e.nativeEvent.actionName === 'increment' ? i + 1 : i - 1)}
        style={[{ marginBottom: GAP, zIndex: dragging ? 10 : 0 }, dragging ? [s.lift, { transform: [{ translateY: dy }, { scale: 1.02 }] }] : { transform: [{ translateY: shift }] }]}>
        <Card id={id} removable={id !== 'envs'} onRemove={() => remove(id)} wiggle={dragging ? null : rotate} />
      </Animated.View>
    );
  });

  return (
    <ScrollView style={s.fill} scrollEnabled={!drag} contentContainerStyle={[s.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
      <PillBar left={<Text style={s.title} accessibilityRole="header">Edit home</Text>}
        right={<Pressable accessibilityRole="button" accessibilityLabel={tr('Done')} onPress={nav.back} style={s.done}><Text style={s.doneText}>Done</Text></Pressable>} />
      <Text style={s.hint}>Drag cards to reorder. Tap × to remove.</Text>
      <View>{rows}</View>
      <Text style={s.sec}>Add widgets</Text>
      {removed.length === 0 ? <Text style={s.hint}>Everything is already on your home.</Text> : (
        <View style={{ gap: 8 }}>
          {removed.map((id) => (
            <Pressable key={id} accessibilityRole="button" accessibilityLabel={tr('Add {0}', LABEL[id])} onPress={() => add(id)} style={[s.ghost]}>
              <View style={s.plus}><Icon name="plus" size={14} color={colors.white} /></View>
              <Text style={s.cardLabel}>{LABEL[id]}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Pressable accessibilityRole="button" accessibilityLabel={tr('Reset to default')} onPress={reset} style={s.reset}><Text style={s.resetText}>Reset to default</Text></Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 8 },
  title: { fontFamily: font.regular, fontSize: 26, color: colors.ink },
  done: { backgroundColor: colors.ink, borderRadius: 999, height: 44, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  doneText: { fontFamily: font.medium, fontSize: 16, color: colors.white },
  hint: { fontFamily: font.regular, fontSize: 14, color: colors.muted, paddingHorizontal: 4 },
  sec: { fontFamily: font.regular, fontSize: 15, color: colors.ink2, paddingHorizontal: 4, marginTop: 14 },
  card: { backgroundColor: colors.white, borderRadius: radius.block, paddingHorizontal: 16, paddingTop: 14, overflow: 'visible' },
  lift: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  cardLabel: { fontFamily: font.regular, fontSize: 15, color: colors.ink2, paddingLeft: 18 },
  x: { position: 'absolute', left: -2, top: -2, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  bar: { height: 10, borderRadius: 5 },
  pill: { height: 24, borderRadius: 12 },
  notes: { borderRadius: 18, padding: 14, gap: 10, height: 96 },
  segs: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 5, borderRadius: 3 },
  tick: { flex: 1, height: 4, borderRadius: 2 },
  rtaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.gaugeTrack },
  envRow: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 34, borderRadius: 17, backgroundColor: colors.chip, paddingHorizontal: 14 },
  envDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.line2 },
  ghost: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 64, borderRadius: radius.block, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.line2, opacity: 0.8, paddingHorizontal: 10 },
  plus: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  reset: { alignItems: 'center', justifyContent: 'center', minHeight: 48, marginTop: 14 },
  resetText: { fontFamily: font.medium, fontSize: 17, color: colors.ink2 },
});
