import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';
import { Button } from '../../design/Primitives';
import { Icon } from '../../design/Icon';
import { colors, font, radius } from '../../design/tokens';
import type { Checklist } from '../../store/store';

const steps: { key: keyof Checklist; label: string; title: string }[] = [
  { key: 'sort', label: 'Sort', title: 'Sort your first payment' },
  { key: 'cover', label: 'Cover', title: 'Cover an envelope that ran over' },
  { key: 'check', label: 'Check', title: "Check what's safe to spend" },
  { key: 'assign', label: 'Assign', title: 'Assign your last tögrög' },
];

// Palette shifts with progress (spec §3.3).
const palettes: string[][] = [
  ['#C9B8F0', '#F6A7C1', '#F7C99B'],
  ['#F7B7A3', '#F9D58A', '#B9A8F2'],
  ['#9ED9F0', '#A8D58C', '#E5EE8A'],
  ['#A8D58C', '#F0E07A', '#8FD3C8'],
  ['#B9A8F2', '#F6A7C1', '#A8D58C'],
];

/** First-week checklist: one card, colour-filled, 4 progress segments, Start performs the next task. */
export function FirstWeekCard({ checklist, onStart, onHide }: { checklist: Checklist; onStart: (k: keyof Checklist) => void; onHide: () => void }) {
  const doneCount = steps.filter((x) => checklist[x.key]).length;
  const current = steps.findIndex((x) => !checklist[x.key]);
  const finished = current === -1;
  const pulse = useRef(new Animated.Value(0.35)).current;
  const [reduce, setReduce] = useState(false);

  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled().then(setReduce); }, []);
  useEffect(() => {
    if (reduce) { pulse.setValue(0.5); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.8, duration: 1400, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.35, duration: 1400, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduce, pulse]);

  return (
    <View style={s.card} accessibilityLabel={`First week, ${doneCount} of 4 done`}>
      <LinearGradient colors={palettes[finished ? 4 : Math.min(doneCount, 3)] as [string, string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><Circle cx="3.5" cy="3.5" r="0.9" fill="#FFFFFF" fillOpacity="0.55" /></Pattern>
        </Defs>
        <Rect x="40%" y="0" width="60%" height="100%" fill="url(#dots)" />
      </Svg>
      <View style={s.top}>
        <Text style={s.eyebrow}>First week</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Hide first-week checklist" onPress={onHide} hitSlop={12} style={s.x}>
          <Icon name="close" size={20} />
        </Pressable>
      </View>
      <Text style={s.title}>{finished ? "You're a budgeter now" : steps[current].title}</Text>
      {!finished ? <Button title="Start" onPress={() => onStart(steps[current].key)} style={{ alignSelf: 'flex-start', marginTop: 14 }} /> : null}
      <View style={s.segRow}>
        {steps.map((st, i) => (
          <View key={st.key} style={s.segCol}>
            <View style={s.seg}>
              {checklist[st.key] ? <View style={[s.segFill, { width: '100%', backgroundColor: colors.ink }]} />
                : i === current ? <Animated.View style={[s.segFill, { width: pulse.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: colors.ink }]} /> : null}
            </View>
            <Text style={s.segLabel}>{st.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: radius.block, overflow: 'hidden', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontFamily: font.regular, fontSize: 13, color: colors.ink2 },
  x: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  title: { fontFamily: font.regular, fontSize: 18, color: colors.ink, marginTop: 2 },
  segRow: { flexDirection: 'row', gap: 6, marginTop: 22 },
  segCol: { flex: 1 },
  seg: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)', overflow: 'hidden' },
  segFill: { height: 3, borderRadius: 2 },
  segLabel: { fontFamily: font.regular, fontSize: 11, color: colors.ink2, marginTop: 6 },
});
