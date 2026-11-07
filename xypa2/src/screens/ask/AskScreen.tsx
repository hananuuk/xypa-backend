import React, { useRef, useState } from 'react';
import { tr } from '../../i18n';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../design/Text';
import { askXypa, AskTurn, getToken } from '../../api/client';
import { Icon } from '../../design/Icon';
import { ScreenFrame } from '../../design/ScreenFrame';
import { colors, font } from '../../design/tokens';
import { buildAskContext } from '../../logic/askContext';
import { CURRENCIES } from '../../logic/money';
import { useNav } from '../../nav';
import { useStore } from '../../store/store';

const CHIPS = ['Can I afford a 200,000₮ jacket?', 'Where did most of my money go this month?', 'Which envelope is closest to running out?', 'What did I spend at my top merchant?'];

export function AskScreen() {
  const st = useStore();
  const nav = useNav();
  const end = useRef<() => void>(() => {});
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setErr(null); setText(''); setBusy(true);
    const history = turns;
    setTurns([...history, { role: 'user', text: question }]);
    try {
      if (!(await getToken())) throw Object.assign(new Error('Sign in with Google in Settings to use Ask xypa.'), { status: 401 });
      const context = buildAskContext({
        today: st.today.iso, month: st.month, currency: CURRENCIES[st.currency ?? 'MNT'].name,
        accounts: st.accounts, envelopes: st.envelopes, goals: st.goals, txns: st.txns,
        views: st.views, readyToAssign: st.rta, safeToSpend: st.safe.today,
      });
      const r = await askXypa(question, history, context);
      setTurns((t) => [...t, { role: 'assistant', text: r.answer }]);
    } catch (e) {
      const status = (e as { status?: number }).status;
      setErr(status === 401 ? (e as Error).message : status === 503 ? 'Ask xypa is not switched on yet.' : "Couldn't get an answer. Try again.");
    } finally { setBusy(false) }
  };

  const input = (
    <View style={s.inputRow}>
      <TextInput accessibilityLabel={tr('Ask xypa')} value={text} onChangeText={setText} placeholder={tr('Ask about your money')} placeholderTextColor={colors.muted} style={s.input} multiline maxLength={500} returnKeyType="send" blurOnSubmit onSubmitEditing={() => send(text)} />
      <Pressable accessibilityRole="button" accessibilityLabel={tr('Send')} disabled={busy || !text.trim()} onPress={() => send(text)} style={[s.send, (busy || !text.trim()) && { opacity: 0.3 }]}><Icon name="chevronRight" size={20} color={colors.white} /></Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenFrame title="Ask xypa" onBack={nav.back} scroll={false} footer={input}>
        <ScrollView ref={(r) => { end.current = () => (r as unknown as { scrollToEnd: (o: { animated: boolean }) => void } | null)?.scrollToEnd({ animated: true }); }} onContentSizeChange={() => end.current()} style={{ flex: 1 }} contentContainerStyle={{ gap: 10, paddingBottom: 12 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {turns.length === 0 ? (
            <View style={{ gap: 8 }}>
              <Text style={s.intro}>Ask about your own spending. I only read your numbers. I never move money.</Text>
              {CHIPS.map((c) => <Pressable key={c} accessibilityRole="button" style={s.chip} onPress={() => send(c)}><Text style={s.chipText}>{c}</Text></Pressable>)}
            </View>
          ) : turns.map((t, i) => (
            <View key={i} style={[s.bubble, t.role === 'user' ? s.me : s.bot]} accessible accessibilityLabel={`${t.role === 'user' ? tr('You') : 'xypa'}: ${t.text}`}>
              <Text style={[s.msg, t.role === 'user' && { color: colors.white }]}>{t.text}</Text>
            </View>
          ))}
          {busy ? <View style={[s.bubble, s.bot]}><Text style={s.msg} accessibilityLiveRegion="polite">Thinking…</Text></View> : null}
          {err ? <Text style={s.err} accessibilityLiveRegion="polite">{err}</Text> : null}
        </ScrollView>
      </ScreenFrame>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  intro: { fontFamily: font.regular, fontSize: 15, color: colors.muted, marginBottom: 4 },
  chip: { backgroundColor: colors.white, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 },
  chipText: { fontFamily: font.regular, fontSize: 15, color: colors.ink },
  bubble: { maxWidth: '86%', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 },
  me: { alignSelf: 'flex-end', backgroundColor: colors.ink },
  bot: { alignSelf: 'flex-start', backgroundColor: colors.white },
  msg: { fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.ink },
  err: { fontFamily: font.regular, fontSize: 14, color: colors.accent },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minHeight: 44, maxHeight: 110, backgroundColor: colors.white, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontFamily: font.regular, fontSize: 15, color: colors.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
});
