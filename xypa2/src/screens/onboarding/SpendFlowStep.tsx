import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { tr } from '../../i18n';
import { Text } from '../../design/Text';
import { colors, font } from '../../design/tokens';
import { groupDigits, pressKey, spokenParts } from '../../logic/amountInput';
import { BigButton, ob, Poster, StepHeader } from './ui';

const NAVY = '#1B2A8A';
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

/** One character of the amount. It pops up from below when it first appears. */
function Pop({ ch, size }: { ch: string; size: number }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(t, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 8 }).start(() => t.setValue(1)); }, [t]);
  return (
    <Animated.Text style={{
      fontFamily: font.bold, fontSize: size, lineHeight: size * 1.15, color: NAVY, fontVariant: ['tabular-nums'],
      opacity: t.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
      transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [size * 0.6, 0] }) }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
    }}>{ch}</Animated.Text>
  );
}

/** Characters with stable keys: digit k keeps its identity as more digits are typed, a comma is new each time it moves. */
function amountChars(digits: string): { key: string; ch: string }[] {
  const out: { key: string; ch: string }[] = [];
  for (let i = 0; i < digits.length; i++) {
    out.push({ key: `d${i}`, ch: digits[i] });
    const right = digits.length - 1 - i;
    if (right > 0 && right % 3 === 0) out.push({ key: `c${i}`, ch: ',' });
  }
  return out;
}

const PRESETS = ['Groceries', 'Eating out', 'Coffee', 'Transport', 'Taxi', 'Shopping', 'Clothes', 'Health', 'Fitness', 'Entertainment', 'Education', 'Kids', 'Pets', 'Gifts', 'Beauty', 'Fuel'];

/** A category chip that pops up from below, one after another. */
function CatChip({ label, on, delay, play, onPress }: { label: string; on: boolean; delay: number; play: number; onPress: () => void }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    t.setValue(0);
    if (play) Animated.spring(t, { toValue: 1, delay, useNativeDriver: true, speed: 16, bounciness: 9 }).start(() => t.setValue(1));
  }, [play]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Animated.View style={{ opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={tr(label)} onPress={onPress} style={[s.cat, on && s.catOn]}>
        <Text style={[s.catText, on && { color: colors.white }]}>{on ? `✓  ${tr(label)}` : tr(label)}</Text>
      </Pressable>
    </Animated.View>
  );
}

export type SpendFlowResult = { monthlySpend: number; categories: string[] };

/**
 * Two steps on one screen. First you type what you spend in a month. Then the amount floats up to the top
 * and shrinks, and you pick the categories that money goes to.
 */
export function SpendFlowStep({ initial, onBack, onNext }: { initial?: SpendFlowResult; onBack: () => void; onNext: (r: SpendFlowResult) => void }) {
  const [digits, setDigits] = useState(initial ? String(initial.monthlySpend) : '');
  const [phase, setPhase] = useState<1 | 2>(initial ? 2 : 1);
  const [cats, setCats] = useState<string[]>(initial?.categories ?? []);
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [topH, setTopH] = useState(0);
  const [played, setPlayed] = useState(initial ? 1 : 0);
  const p = useRef(new Animated.Value(initial ? 1 : 0)).current;
  const win = useWindowDimensions();

  const value = Number(digits || 0);
  const chars = amountChars(digits);
  const size = chars.length <= 7 ? 64 : chars.length <= 9 ? 54 : 46;
  const { million, thousand, rest } = spokenParts(value);
  const spoken = [million ? tr('{0} million', million) : '', thousand ? tr('{0} thousand', thousand) : '', rest && value >= 1000 ? String(rest) : ''].filter(Boolean).join(' ');
  const all = [...PRESETS, ...cats.filter((c) => !PRESETS.includes(c))];

  const go = (to: 1 | 2) => {
    setPhase(to); setAdding(false);
    if (to === 2) setPlayed((n) => n + 1);
    Animated.timing(p, { toValue: to === 2 ? 1 : 0, duration: 520, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  };
  const press = (k: string) => {
    const next = pressKey(digits, k);
    if (next === digits) return;
    try { Haptics.selectionAsync(); } catch { /* no haptics */ }
    setDigits(next);
  };
  const toggle = (c: string) => { try { Haptics.selectionAsync(); } catch { /* no haptics */ } setCats((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c])); };
  const addCat = () => {
    const n = draftName.trim();
    if (n && !all.some((c) => c.toLowerCase() === n.toLowerCase())) setCats((cur) => [...cur, n]);
    else if (n) { const hit = all.find((c) => c.toLowerCase() === n.toLowerCase()); if (hit && !cats.includes(hit)) setCats((cur) => [...cur, hit]); }
    setDraftName(''); setAdding(false);
  };

  const lift = topH ? -(topH / 2 - 38) : 0;
  return (
    <Poster image={require('../../../assets/flow-bg.jpg')}>
      <Svg pointerEvents="none" width={win.width} height={400} style={{ position: 'absolute', top: 0, left: 0 }}>
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.96" />
            <Stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0.9" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect width={win.width} height={400} fill="url(#fade)" />
      </Svg>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <StepHeader step={phase} onBack={() => (phase === 2 ? go(1) : onBack())} />
        <View>
          <Animated.View style={{ opacity: p.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: 'clamp' }) }}>
            <Text style={s.title} accessibilityRole="header">Let's work out your money flow first.</Text>
            <Text style={s.ask}>How much do you spend in a month?</Text>
          </Animated.View>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: p.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
            <Text style={s.title}>Where does it go?</Text>
            <Text style={s.ask}>Pick what you spend on. You can change this later.</Text>
          </Animated.View>
        </View>

        <View style={{ flex: 1 }}>
          <View style={s.mid} onLayout={(e) => setTopH(e.nativeEvent.layout.height)}>
            <Animated.View style={{ alignItems: 'center', transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, lift] }) }, { scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.55] }) }] }}>
              <View style={s.amount} accessible accessibilityLabel={tr('{0} tögrög a month', groupDigits(digits || '0'))} accessibilityLiveRegion="polite">
                {chars.length ? chars.map((c) => <Pop key={c.key} ch={c.ch} size={size} />) : <Text style={[s.zero, { fontSize: size }]}>0</Text>}
                <Text style={[s.tug, { fontSize: size * 0.5 }]}>₮</Text>
              </View>
              <Animated.Text style={[s.spoken, { opacity: p.interpolate({ inputRange: [0, 0.4], outputRange: [1, 0], extrapolate: 'clamp' }) }]}>{spoken || ' '}</Animated.Text>
            </Animated.View>
          </View>
          <Animated.View pointerEvents={phase === 1 ? 'auto' : 'none'} style={[s.pad, { opacity: p.interpolate({ inputRange: [0, 0.6], outputRange: [1, 0], extrapolate: 'clamp' }), transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, 140] }) }] }]}>
            {KEYS.map((k, i) => k === '' ? <View key={i} style={s.key} /> : (
              <Pressable key={k} accessibilityRole="button" accessibilityLabel={k === 'back' ? tr('Delete') : k} onPress={() => press(k)}
                onLongPress={k === 'back' ? () => setDigits('') : undefined}
                style={({ pressed }) => [s.key, pressed && s.keyDown]}>
                {k === 'back' ? <Text style={s.keyText}>⌫</Text> : <Text style={s.keyText}>{k}</Text>}
              </Pressable>
            ))}
          </Animated.View>
          <Animated.View pointerEvents={phase === 2 ? 'auto' : 'none'} style={[s.panel, { opacity: p.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' }), transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] }]}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.chips}>
              {all.map((c, i) => <CatChip key={c} label={c} on={cats.includes(c)} delay={i * 35} play={played} onPress={() => toggle(c)} />)}
              {adding ? (
                <View style={s.addRow}>
                  <TextInput autoFocus value={draftName} onChangeText={setDraftName} onSubmitEditing={addCat} returnKeyType="done" placeholder={tr('Category name')} placeholderTextColor={colors.muted} accessibilityLabel={tr('Category name')} style={s.input} />
                  <Pressable accessibilityRole="button" accessibilityLabel={tr('Add')} onPress={addCat} style={s.addBtn}><Text style={s.addBtnText}>Add</Text></Pressable>
                </View>
              ) : (
                <Pressable accessibilityRole="button" accessibilityLabel={tr('Add category')} onPress={() => setAdding(true)} style={[s.cat, s.catAdd]}><Text style={s.catText}>+ Add category</Text></Pressable>
              )}
            </ScrollView>
          </Animated.View>
        </View>
        <BigButton title="Continue" disabled={phase === 1 ? value <= 0 : cats.length === 0} onPress={() => (phase === 1 ? go(2) : onNext({ monthlySpend: value, categories: cats }))} />
      </KeyboardAvoidingView>
    </Poster>
  );
}

const s = StyleSheet.create({
  title: { fontFamily: font.medium, fontSize: 32, lineHeight: 38, letterSpacing: -1, color: ob.ink, marginTop: 8 },
  ask: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: ob.ink, opacity: 0.7, marginTop: 10 },
  mid: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 110 },
  amount: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  zero: { fontFamily: font.bold, color: NAVY, opacity: 0.3 },
  tug: { fontFamily: font.medium, color: NAVY, opacity: 0.55, marginLeft: 4, marginTop: 4 },
  spoken: { fontFamily: font.regular, fontSize: 15, color: ob.ink, opacity: 0.7, marginTop: 6 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  key: { width: '33.333%', height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 31 },
  keyDown: { backgroundColor: 'rgba(255,255,255,0.55)' },
  keyText: { fontFamily: font.medium, fontSize: 28, color: ob.ink },
  panel: { position: 'absolute', left: 0, right: 0, top: 84, bottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingBottom: 12 },
  cat: { minHeight: 46, paddingHorizontal: 18, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.82)', borderWidth: 1, borderColor: 'rgba(27,42,138,0.18)', alignItems: 'center', justifyContent: 'center' },
  catOn: { backgroundColor: NAVY, borderColor: NAVY },
  catAdd: { borderStyle: 'dashed', backgroundColor: 'rgba(255,255,255,0.5)' },
  catText: { fontFamily: font.medium, fontSize: 16, color: ob.ink },
  addRow: { flexDirection: 'row', gap: 8, width: '100%', alignItems: 'center' },
  input: { flex: 1, fontFamily: font.regular, fontSize: 16, color: ob.ink, backgroundColor: colors.white, borderRadius: 23, minHeight: 46, paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(27,42,138,0.18)' },
  addBtn: { minHeight: 46, paddingHorizontal: 20, borderRadius: 23, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontFamily: font.medium, fontSize: 16, color: colors.white },
});
