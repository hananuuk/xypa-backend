import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { scanGmail } from '../../api/client';
import { colors, font } from '../../design/tokens';
import { formatMoney } from '../../logic/money';
import { draftFromScan, Found } from '../../logic/scan';
import { BigButton, ob, Poster, StepFrame } from './ui';

type Line = { text: string; done: boolean };

/** "Reading emails": reads the last 3 months of bank emails, ticking checks in one by one, then moves on by itself. */
export function Reading({ onDone, onFail }: { onDone: (found: Found[]) => void; onFail: () => void }) {
  const [progress, setProgress] = useState({ read: 0, total: 0, found: 0 });
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const started = useRef(0);

  useEffect(() => {
    let cancelled = false;
    started.current += 1;
    setError(null); setLines([]); setProgress({ read: 0, total: 0, found: 0 });
    (async () => {
      try {
        const found = await scanGmail((p) => { if (!cancelled) setProgress(p); });
        if (cancelled) return;
        const d = draftFromScan(found);
        const texts = [
          `${d.accounts.length} ${d.accounts.length === 1 ? 'account' : 'accounts'} · ${d.regular.length} regular ${d.regular.length === 1 ? 'payment' : 'payments'}${d.regular.some((r) => r.kind === 'Loan') ? ', including a loan' : ''}`,
          `${found.filter((f) => f.type === 'spend').length} card payments`,
          'Skipped everything that isn’t from a bank',
        ];
        for (let i = 0; i < texts.length; i += 1) {
          if (cancelled) return;
          setLines((l) => [...l, { text: texts[i], done: true }]);
          await new Promise((r) => setTimeout(r, 450));
        }
        await new Promise((r) => setTimeout(r, 500));
        if (!cancelled) onDone(found);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return (
    <Poster bg="#AFB1E7" glowA="#D3B9EC" glowB="#8F94DB">
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={s.t} accessibilityRole="header">Reading your bank emails</Text>
        <Text style={s.sub}>The last 3 months. Only emails from banks.</Text>
        {error ? (
          <View style={{ marginTop: 28, gap: 12 }}>
            <View style={s.err}><Text style={s.errT}>We couldn't read your emails: {error}</Text></View>
            <BigButton title="Try again" onPress={() => setAttempt((a) => a + 1)} />
            <Pressable accessibilityRole="button" accessibilityLabel="I'll set things up myself" onPress={onFail} style={s.link}><Text style={s.linkT}>I'll set things up myself</Text></Pressable>
          </View>
        ) : (
          <View style={{ marginTop: 28, gap: 12 }} accessibilityLiveRegion="polite">
            {lines.length === 0 ? (
              <View style={s.row}><ActivityIndicator color={ob.ink} /><Text style={s.line}>{progress.total ? `Read ${progress.read} of ${progress.total}` : 'Looking for bank emails…'}</Text></View>
            ) : lines.map((l) => (
              <View key={l.text} style={s.row}><View style={s.tick}><Text style={s.tickT}>✓</Text></View><Text style={s.line}>{l.text}</Text></View>
            ))}
          </View>
        )}
      </View>
    </Poster>
  );
}

/** Nothing found: three ways forward (spec 4.3). */
export function NoEmails({ onBack, onStatement, onAlerts, onManual, onOtherAccount }: { onBack: () => void; onStatement: () => void; onAlerts: () => void; onManual: () => void; onOtherAccount: () => void }) {
  const opt = (title: string, note: string, onPress: () => void, best?: boolean) => (
    <Pressable key={title} accessibilityRole="button" accessibilityLabel={`${title}. ${note}`} onPress={onPress} style={s.opt}>
      <View style={{ flex: 1 }}><Text style={s.optT}>{title}</Text><Text style={s.optN}>{note}</Text></View>
      {best ? <View style={s.best}><Text style={s.bestT}>Best</Text></View> : null}
    </Pressable>
  );
  return (
    <StepFrame step={1} title="We didn't find any bank emails" subtitle="That's okay. Pick what works for you." onBack={onBack}
      footer={<Pressable accessibilityRole="button" accessibilityLabel="Try another account" onPress={onOtherAccount} style={s.link}><Text style={s.linkT}>Try another account</Text></Pressable>}>
      <View style={{ gap: 10, marginTop: 6 }}>
        {opt('Upload a statement', 'Your last 3 months from your bank app, as PDF, Excel or CSV.', onStatement, true)}
        {opt('Turn on email alerts', 'Ask your bank to email you about new payments.', onAlerts)}
        {opt("I'll add things myself", 'Type in your accounts and regular payments.', onManual)}
      </View>
    </StepFrame>
  );
}

export function EmailAlerts({ onBack, onStatement, onManual }: { onBack: () => void; onStatement: () => void; onManual: () => void }) {
  return (
    <StepFrame step={1} title="Turn on email alerts" subtitle="Ask your bank to send payment notifications to the same Gmail address you signed in with." onBack={onBack}
      footer={<><BigButton title="Upload a statement as well" onPress={onStatement} /><Pressable accessibilityRole="button" accessibilityLabel="I'll add things myself" onPress={onManual} style={s.link}><Text style={s.linkT}>I'll add things myself</Text></Pressable></>}>
      <View style={s.card}>
        {['Open your bank app and find the notification or alert settings.', 'Turn on email notifications for card payments and transfers.', 'Use the same Gmail address you signed in to xypa with.'].map((t, i) => (
          <View key={t} style={s.step}><View style={s.num}><Text style={s.numT}>{i + 1}</Text></View><Text style={s.stepT}>{t}</Text></View>
        ))}
      </View>
      <View style={[s.card, { marginTop: 12 }]}><Text style={s.stepT}>Alerts only cover new payments from now on. To see the last 3 months, upload a statement too.</Text></View>
    </StepFrame>
  );
}

export const summaryLine = (n: number, sum: number) => `${n} · ${formatMoney(sum)}`;

const s = StyleSheet.create({
  t: { fontFamily: font.medium, fontSize: 36, lineHeight: 40, letterSpacing: -1.4, color: ob.ink },
  sub: { fontFamily: font.regular, fontSize: 17, color: colors.ink2, marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 36 },
  line: { fontFamily: font.regular, fontSize: 18, color: ob.ink, flexShrink: 1 },
  tick: { width: 26, height: 26, borderRadius: 13, backgroundColor: ob.ink, alignItems: 'center', justifyContent: 'center' },
  tickT: { color: colors.white, fontSize: 14, fontFamily: font.medium },
  err: { backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 18, padding: 16 },
  errT: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: ob.ink },
  link: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  linkT: { fontFamily: font.medium, fontSize: 16, color: ob.ink },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 18, minHeight: 72 },
  optT: { fontFamily: font.medium, fontSize: 17, color: ob.ink },
  optN: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.ink2, marginTop: 4 },
  best: { backgroundColor: ob.ink, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  bestT: { fontFamily: font.medium, fontSize: 12, color: colors.white },
  card: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 14 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEEBE5', alignItems: 'center', justifyContent: 'center' },
  numT: { fontFamily: font.medium, fontSize: 14, color: ob.ink },
  stepT: { flex: 1, fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: ob.ink },
});
