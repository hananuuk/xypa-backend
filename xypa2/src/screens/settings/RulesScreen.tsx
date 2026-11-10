import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { tr } from '../../i18n';
import { Text } from '../../design/Text';
import { Chip, Field } from '../../design/Fields';
import { Icon } from '../../design/Icon';
import { Block, Button, InnerCard } from '../../design/Primitives';
import { ScreenFrame } from '../../design/ScreenFrame';
import { colors, font } from '../../design/tokens';
import { useNav } from '../../nav';
import { useStore } from '../../store/store';

/** Sorting rules: "if a payment contains this text, file it to this envelope". */
export function RulesScreen() {
  const st = useStore();
  const nav = useNav();
  const [text, setText] = useState('');
  const [env, setEnv] = useState<string | null>(null);
  const name = (id: string) => st.envelopes.find((e) => e.id === id)?.name ?? '—';
  const entries = st.rules.map((r, i) => ({ r, i }));
  const written = entries.filter((x) => x.r.contains);
  const learned = entries.filter((x) => !x.r.contains);
  const ok = text.trim().length > 0 && !!env;

  const save = () => {
    if (!ok || !env) return;
    st.addKeywordRule(text, env);
    setText(''); setEnv(null);
  };

  const list = (items: typeof entries) => items.map(({ r, i }) => (
    <InnerCard key={`${r.merchant}-${i}`} style={s.row}>
      <View style={{ flex: 1 }}>
        <Text style={s.label} numberOfLines={1}>{r.contains ? tr('Contains “{0}”', r.merchant) : r.merchant}</Text>
        <Text style={s.sub}>{name(r.envelopeId)}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={tr('Remove rule')} hitSlop={10} onPress={() => st.removeRule(i)}>
        <Icon name="close" size={18} color={colors.muted} />
      </Pressable>
    </InnerCard>
  ));

  return (
    <ScreenFrame title="Sorting rules" onBack={nav.back}>
      <Block>
        <Text style={s.eyebrow}>Add a rule</Text>
        <Text style={s.help}>When a payment email or statement line contains this text, xypa files it to that envelope on its own.</Text>
        <Field label="Text to look for, e.g. EMART" value={text} onChangeText={setText} autoCapitalize="none" autoCorrect={false} placeholder={tr('Text to look for, e.g. EMART')} />
        <View style={s.wrap}>
          {st.envelopes.map((e) => <Chip key={e.id} label={e.name} color={e.color} selected={env === e.id} accent onPress={() => setEnv(e.id)} />)}
        </View>
        <Button full title="Save rule" disabled={!ok} onPress={save} />
      </Block>
      <Block>
        <Text style={s.eyebrow}>Rules you wrote</Text>
        {written.length ? list(written) : <Text style={s.help}>No rules yet.</Text>}
      </Block>
      {learned.length ? (
        <Block>
          <Text style={s.eyebrow}>Sorted by you</Text>
          {list(learned)}
        </Block>
      ) : null}
    </ScreenFrame>
  );
}

const s = StyleSheet.create({
  eyebrow: { fontFamily: font.medium, fontSize: 12, letterSpacing: 1.4, color: colors.navy, marginBottom: 8 },
  help: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.muted, marginBottom: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  label: { fontFamily: font.medium, fontSize: 16, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
});
