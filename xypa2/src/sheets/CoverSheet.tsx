import Slider from '@react-native-community/slider';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../design/BottomSheet';
import { Money } from '../design/Amounts';
import { Button, InnerCard } from '../design/Primitives';
import { Icon } from '../design/Icon';
import { colors, font } from '../design/tokens';
import { coverCap } from '../logic/budget';
import { formatMoney } from '../logic/money';
import type { CoverSource } from '../logic/types';
import { useStore } from '../store/store';
import { Pressable } from 'react-native';

/**
 * Cover (the most important sheet): TAKE FROM at the top (Ready to Assign by default, plus any envelopes),
 * INTO at the bottom. Each source is capped at min(what it has, need − other sources), so covers can be partial.
 */
export function CoverSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const st = useStore();
  const target = st.views.find((e) => e.id === id);
  const need = Math.max(0, -(target?.left ?? 0));
  const rtaHas = Math.max(0, st.rta);
  const [sources, setSources] = useState<CoverSource[]>(() => [{ kind: 'rta', amount: Math.min(rtaHas, need) }]);
  const [picking, setPicking] = useState(false);

  const has = (s: CoverSource) => (s.kind === 'rta' ? rtaHas : Math.max(0, st.views.find((e) => e.id === s.envelopeId)?.left ?? 0));
  const nameOf = (s: CoverSource) => (s.kind === 'rta' ? 'Ready to Assign' : st.views.find((e) => e.id === s.envelopeId)?.name ?? '');
  const total = sources.reduce((a, s) => a + s.amount, 0);
  const remainingNeed = need - total;

  const used = new Set(sources.flatMap((s) => (s.kind === 'envelope' ? [s.envelopeId] : [])));
  const candidates = useMemo(() => st.views.filter((e) => e.id !== id && e.left > 0 && !used.has(e.id)), [st.views, id, sources]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAmount = (i: number, amount: number) => {
    const other = total - sources[i].amount;
    const cap = coverCap(has(sources[i]), need, other);
    setSources(sources.map((s, j) => (j === i ? { ...s, amount: Math.min(Math.round(amount / 100) * 100, cap) } : s)));
  };

  if (!target) return null;
  return (
    <BottomSheet visible title="Cover" onClose={onClose}>
      <Text style={s.eyebrow}>TAKE FROM</Text>
      {sources.map((src, i) => {
        const other = total - src.amount;
        const cap = coverCap(has(src), need, other);
        return (
          <InnerCard key={src.kind === 'rta' ? 'rta' : src.envelopeId} style={s.source}>
            <View style={s.srcTop}>
              <Text style={s.srcName}>{nameOf(src)}</Text>
              <Money always value={src.amount} style={s.srcAmt} />
            </View>
            <Text style={s.hint}>Has {formatMoney(has(src))} · leaves {formatMoney(has(src) - src.amount)}</Text>
            <Slider accessibilityLabel={`Amount from ${nameOf(src)}`} minimumValue={0} maximumValue={Math.max(cap, 1)} step={100}
              value={src.amount} onValueChange={(v) => setAmount(i, v)} minimumTrackTintColor={colors.ink} maximumTrackTintColor={colors.line2} thumbTintColor={colors.ink} disabled={cap === 0} />
            {src.kind === 'envelope' ? (
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${nameOf(src)}`} onPress={() => setSources(sources.filter((_, j) => j !== i))} hitSlop={8}>
                <Text style={s.remove}>Remove</Text>
              </Pressable>
            ) : null}
          </InnerCard>
        );
      })}

      {picking ? (
        <View style={{ gap: 5, marginTop: 6 }}>
          {candidates.length === 0 ? <Text style={s.hint}>No other envelope has money to give.</Text> : candidates.map((e) => (
            <Pressable key={e.id} accessibilityRole="button" accessibilityLabel={`Take from ${e.name}, has ${formatMoney(e.left)}`}
              onPress={() => { setSources([...sources, { kind: 'envelope', envelopeId: e.id, amount: 0 }]); setPicking(false); }} style={s.pick}>
              <Text style={s.srcName}>{e.name}</Text><Text style={s.hint}>{formatMoney(e.left)}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Pressable accessibilityRole="button" accessibilityLabel="Take from another envelope" onPress={() => setPicking(true)} style={s.add}>
          <Icon name="plus" size={16} /><Text style={s.addText}>Take from another envelope</Text>
        </Pressable>
      )}

      <Text style={[s.eyebrow, { marginTop: 18 }]}>INTO</Text>
      <InnerCard>
        <View style={s.srcTop}>
          <Text style={s.srcName}>{target.name}</Text>
          <Text style={[s.srcAmt, { color: remainingNeed === 0 ? colors.ink : colors.accent }]}>
            {formatMoney(-need)} → {formatMoney(-remainingNeed)}
          </Text>
        </View>
        {remainingNeed === 0
          ? <View style={s.ok}><Icon name="check" size={15} color={colors.muted} /><Text style={s.hint}>Fully covered</Text></View>
          : <Text style={s.hint}>{total > 0 ? `Partly covered · ${formatMoney(remainingNeed)} still over` : `Still over by ${formatMoney(remainingNeed)}`}</Text>}
      </InnerCard>

      <Button full variant="accent" title={`Move ${formatMoney(total)}`} disabled={total === 0}
        onPress={() => { st.cover(id, sources); onClose(); }} style={{ marginTop: 16 }} />
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  eyebrow: { fontFamily: font.regular, fontSize: 12, letterSpacing: 0.6, color: colors.muted, marginBottom: 8 },
  source: { marginBottom: 6, gap: 4 },
  srcTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  srcName: { fontFamily: font.regular, fontSize: 16, color: colors.ink },
  srcAmt: { fontFamily: font.medium, fontSize: 18, color: colors.ink, fontVariant: ['tabular-nums'] },
  hint: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  remove: { fontFamily: font.regular, fontSize: 13, color: colors.accentInk, minHeight: 32, lineHeight: 32 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 4 },
  addText: { fontFamily: font.regular, fontSize: 15, color: colors.ink },
  pick: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.inner, borderRadius: 14, minHeight: 48, paddingHorizontal: 14 },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
});
