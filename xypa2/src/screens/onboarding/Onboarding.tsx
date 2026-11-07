import React, { useState } from 'react';
import { BankAvatar } from '../../design/BankAvatar';
import { BANKS, bankFor } from '../../data/banks';
import { authenticate, me } from '../../api/client';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, font } from '../../design/tokens';
import { safeToSpend } from '../../logic/budget';
import { formatMoney, parseMoney } from '../../logic/money';
import {
  assignedTotal, buildPlan, Draft, emptyDraft, fillWhatFits, monthCost, moneyToPlan, prefill, regularTotal, usualTotal, wants, yearlyMonthly,
} from '../../logic/onboarding';
import { monthlySaving } from '../../logic/budget';
import { draftFromScan, Found, txnsFromScan } from '../../logic/scan';
import { useStore } from '../../store/store';
import { StatementStep } from './StatementStep';
import { EmailAlerts, NoEmails, Reading } from './GmailSteps';
import { AmountInput, BigButton, CostFooter, DashedAdd, ob, Poster, SectionHead, StepFrame, Switch } from './ui';

type Step = 'hello' | 'intro' | 'reading' | 'noEmails' | 'alerts' | 'statement' | 'accounts' | 'regular' | 'usual' | 'yearly' | 'assign' | 'ready';
const ORDER: Step[] = ['intro', 'accounts', 'regular', 'usual', 'yearly', 'assign'];
const uid = () => Math.random().toString(36).slice(2, 8);

export function Onboarding() {
  const st = useStore();
  const [step, setStep] = useState<Step>('hello');
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [assigned, setAssigned] = useState<Record<string, number>>({});
  const [found, setFound] = useState<Found[]>([]);
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statementBack, setStatementBack] = useState<Step>('noEmails');
  const set = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));
  const n = ORDER.indexOf(step as Step) + 1;
  const back = () => setStep(ORDER[Math.max(0, ORDER.indexOf(step) - 1)] ?? 'hello');
  const next = () => setStep(ORDER[ORDER.indexOf(step) + 1] ?? 'ready');

  const signIn = async () => {
    setBusy(true); setAuthMsg(null);
    const r = await authenticate('signin');
    setBusy(false);
    if (r.ok) { st.setSession(r.me); setStep('intro'); } else if (r.reason !== 'cancelled') setAuthMsg(`Sign-in didn't work${r.message ? `: ${r.message}` : ''}. Try again.`);
  };
  const allowGmail = async () => {
    setBusy(true); setAuthMsg(null);
    const r = await authenticate('gmail');
    setBusy(false);
    if (r.ok) { st.setSession(r.me); setStep('reading'); }
    else if (r.reason === 'wrong_account') setAuthMsg('Please pick the same Google account you signed in with.');
    else if (r.reason !== 'cancelled') setAuthMsg(`Gmail access didn't work${r.message ? `: ${r.message}` : ''}. Try again, or set things up yourself.`);
  };
  const otherAccount = async () => { const r = await authenticate('signin'); if (r.ok) { st.setSession(r.me); setStep('intro'); } };
  const useFound = (f: Found[]) => {
    setFound(f);
    if (f.length === 0) { setStep('noEmails'); return; }
    setDraft(draftFromScan(f));
    setStep('accounts');
  };

  if (step === 'hello') return <Hello onStart={signIn} busy={busy} message={authMsg} />;
  if (step === 'reading') return <Reading onDone={useFound} onFail={() => setStep('accounts')} />;
  if (step === 'noEmails') return <NoEmails onBack={() => setStep('intro')} onStatement={() => { setStatementBack('noEmails'); setStep('statement'); }} onAlerts={() => setStep('alerts')} onManual={() => setStep('accounts')} onOtherAccount={otherAccount} />;
  if (step === 'statement') return <StatementStep onBack={() => setStep(statementBack)} onRead={useFound} />;
  if (step === 'alerts') return <EmailAlerts onBack={() => setStep('noEmails')} onStatement={() => setStep('statement')} onManual={() => setStep('accounts')} />;
  if (step === 'ready') return <Ready draft={draft} assigned={assigned} onOpen={() => { const plan = buildPlan(draft, assigned); st.completeOnboarding({ ...plan, txns: txnsFromScan(found, plan.envelopes, plan.accounts, st.today.month) }); }} onRestart={() => { setDraft(emptyDraft()); setAssigned({}); setFound([]); setStep('hello'); }} />;
  if (step === 'intro') return <Intro onBack={() => setStep('hello')} onManual={() => { setFound([]); setStep('accounts'); }} onStatement={() => { setStatementBack('intro'); setStep('statement'); }} onAllow={allowGmail} busy={busy} message={authMsg} />;
  if (step === 'accounts') return <Accounts n={n} draft={draft} set={set} onBack={back} onNext={next} />;
  if (step === 'regular') return <Regular n={n} draft={draft} set={set} onBack={back} onNext={next} />;
  if (step === 'usual') return <Usual n={n} draft={draft} set={set} onBack={back} onNext={next} />;
  if (step === 'yearly') return <Yearly n={n} draft={draft} set={set} onBack={back} onNext={() => { setAssigned(prefill(draft)); next(); }} />;
  return <Assign n={n} draft={draft} assigned={assigned} setAssigned={setAssigned} onBack={back} onDone={() => setStep('ready')} />;
}

/* ---------- Hello ---------- */
function Hello({ onStart, busy, message }: { onStart: () => void; busy: boolean; message: string | null }) {
  return (
    <Poster>
      <View style={s.topRow}><Text style={s.logo}>xypa</Text><Text style={s.index}>--01</Text></View>
      <View style={s.fan}>
        <EnvCard style={{ left: 8, top: 62, transform: [{ rotate: '-7deg' }] }} label="Rent" value="1,200,000₮" />
        <EnvCard style={{ right: 8, top: 56, transform: [{ rotate: '7deg' }] }} label="Groceries" value="700,000₮" />
        <EnvCard style={{ alignSelf: 'center', top: 0, zIndex: 2 }} label="Safe today" value="32,500₮" red />
      </View>
      <View style={{ flex: 1 }} />
      <Text style={s.hello} accessibilityRole="header">Give every tögrög a job.</Text>
      <Text style={s.helloSub}>Plan the money you already have, one envelope at a time, and always know what's safe to spend.</Text>
      <View style={{ height: 28 }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Continue with Google" accessibilityState={{ disabled: busy }} disabled={busy} onPress={onStart} style={[s.google, busy && { opacity: 0.6 }]}>
        <View style={s.g}><Text style={s.gText}>G</Text></View>
        <Text style={s.googleText}>Continue with Google</Text>
      </Pressable>
      <Text style={s.login} accessibilityLiveRegion="polite">{message ?? 'Signing in only shares your name and email. Reading your bank emails is a separate step, and you choose.'}</Text>
    </Poster>
  );
}
function EnvCard({ style, label, value, red }: { style: object; label: string; value: string; red?: boolean }) {
  return (
    <View style={[s.envCard, style]}>
      <Svg width="100%" height={36} viewBox="0 0 160 36" preserveAspectRatio="none" style={{ position: 'absolute', top: 0 }}><Path d="M0 36 L80 2 L160 36" stroke={ob.ink} strokeWidth="1.2" fill="none" /></Svg>
      <Text style={s.envLabel}>{label}</Text>
      <Text style={[s.envValue, red && { color: '#B42318' }]}>{value}</Text>
    </View>
  );
}

/* ---------- Step 1 ---------- */
function Intro({ onBack, onManual, onStatement, onAllow, busy, message }: { onBack: () => void; onManual: () => void; onStatement: () => void; onAllow: () => void; busy: boolean; message: string | null }) {
  return (
    <StepFrame step={1} title="Let your bank emails do the typing" subtitle="xypa can read the payment emails your bank already sends and sort them for you." onBack={onBack}
      footer={<>
        <BigButton title="Allow Gmail access" disabled={busy} onPress={onAllow} />
        {message ? <Text style={s.soon} accessibilityLiveRegion="polite">{message}</Text> : <Text style={s.soon}>Read only. Bank senders only.</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Upload a statement instead" onPress={onStatement} style={s.link}><Text style={s.linkText}>Upload a statement instead</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="I'll set things up myself" onPress={onManual} style={s.link}><Text style={s.linkText}>I'll set things up myself</Text></Pressable>
      </>}>
      <SectionHead title="XYPA CAN" />
      {['Read your bank emails', 'Find your regular payments', 'Sort your spending'].map((t) => <Text key={t} style={s.li}>✓  {t}</Text>)}
      <SectionHead title="XYPA NEVER" />
      {['Move your money', 'Read your other emails', 'Share your data'].map((t) => <Text key={t} style={s.li}>✕  {t}</Text>)}
    </StepFrame>
  );
}

/* ---------- Step 2 ---------- */
function Accounts({ n, draft, set, onBack, onNext }: P) {
  const [name, setName] = useState('');
  const total = moneyToPlan(draft);
  const scanned = draft.accounts.some((a) => a.note);
  const add = () => { if (!name.trim()) return; set({ accounts: [...draft.accounts, { id: uid(), name: name.trim(), kind: 'Checking', balance: 0 }] }); setName(''); };
  return (
    <StepFrame step={n} title={scanned ? `We found ${draft.accounts.length} ${draft.accounts.length === 1 ? 'account' : 'accounts'}` : 'Where is your money?'}
      subtitle={scanned ? 'Check the balances. Fix any that look off, and add cash or other accounts.' : 'Add each account and the cash you hold. Balances only, no logins.'} onBack={onBack}
      footer={<BigButton title="Looks right" disabled={total <= 0} onPress={onNext} />}>
      <Row title="Cash" note="In your wallet"><AmountInput label="Cash" value={draft.cash} onChange={(v) => set({ cash: v })} /></Row>
      {draft.accounts.map((a) => (
        <Row key={a.id} icon={<BankAvatar name={a.name} size={36} />} title={a.name} note={a.note ?? 'Added by hand'}><AmountInput label={`${a.name} balance`} value={a.balance} onChange={(v) => set({ accounts: draft.accounts.map((x) => (x.id === a.id ? { ...x, balance: v } : x)) })} /></Row>
      ))}
      <Text style={s.rowN}>Add a bank</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {BANKS.filter((b) => !draft.accounts.some((a) => bankFor(a.name)?.id === b.id)).map((b) => (
          <Pressable key={b.id} accessibilityRole="button" accessibilityLabel={`Add ${b.name}`} onPress={() => set({ accounts: [...draft.accounts, { id: uid(), name: b.name, kind: 'Checking', balance: 0 }] })} style={s.addBtn}><Text style={s.addText}>{b.name}</Text></Pressable>
        ))}
      </View>
      <View style={s.addRow}>
        <TextInput accessibilityLabel="Account name" placeholder="Account name" placeholderTextColor={colors.muted} value={name} onChangeText={setName} onSubmitEditing={add} style={s.nameInput} />
        <Pressable accessibilityRole="button" accessibilityLabel="Add account" onPress={add} style={s.addBtn}><Text style={s.addText}>Add</Text></Pressable>
      </View>
      <View style={s.totalRow}><Text style={s.totalL}>Money to plan with</Text><Text style={s.totalV}>{formatMoney(total)}</Text></View>
      <View style={s.note}><Text style={s.noteText}>We only plan money you have today, not next month's salary.</Text></View>
    </StepFrame>
  );
}
type P = { n: number; draft: Draft; set: (p: Partial<Draft>) => void; onBack: () => void; onNext: () => void };
const Row = ({ title, note, icon, children }: { title: string; note?: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <View style={s.row}>{icon ? <View style={{ marginRight: 10 }}>{icon}</View> : null}<View style={{ flex: 1 }}><Text style={s.rowT}>{title}</Text>{note ? <Text style={s.rowN}>{note}</Text> : null}</View>{children}</View>
);

/* ---------- Step 3 ---------- */
function Regular({ n, draft, set, onBack, onNext }: P) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(''); const [amt, setAmt] = useState(0); const [kind, setKind] = useState<'Loan' | 'Bill' | 'Subscription'>('Bill');
  const on = draft.regular.filter((r) => r.on).length;
  const save = () => { if (!name.trim() || !amt) return; set({ regular: [...draft.regular, { id: uid(), name: name.trim(), kind, monthly: amt, note: 'Every month', on: true }] }); setName(''); setAmt(0); setOpen(false); };
  const groups: { k: 'Loan' | 'Bill' | 'Subscription'; label: string }[] = [{ k: 'Loan', label: 'LOANS' }, { k: 'Bill', label: 'BILLS' }, { k: 'Subscription', label: 'SUBSCRIPTIONS' }];
  return (
    <StepFrame step={n} title={draft.regular.length ? `${draft.accounts.some((a) => a.note) ? 'We found ' : ''}${draft.regular.length} regular ${draft.regular.length === 1 ? 'payment' : 'payments'}` : 'Regular payments'} subtitle="Rent, bills, subscriptions and loans that leave your account every month. Turn off any that aren't yours." onBack={onBack}
      footer={<><CostFooter regular={regularTotal(draft)} everyday={usualTotal(draft)} /><BigButton title={on ? `Make ${on} into envelopes` : 'Continue'} onPress={onNext} /></>}>
      {groups.map((g) => {
        const items = draft.regular.filter((r) => r.kind === g.k);
        if (!items.length) return null;
        return (
          <View key={g.k}>
            <SectionHead title={g.label} right={`${formatMoney(items.filter((r) => r.on).reduce((a, r) => a + r.monthly, 0))} / month`} />
            {items.map((r) => (
              <Row key={r.id} title={r.name} note={r.note}>
                <Text style={[s.amt, !r.on && s.struck]}>{formatMoney(r.monthly)}</Text>
                <View style={{ width: 10 }} /><Switch label={`Keep ${r.name}`} value={r.on} onChange={(v) => set({ regular: draft.regular.map((x) => (x.id === r.id ? { ...x, on: v } : x)) })} />
              </Row>
            ))}
          </View>
        );
      })}
      {open ? (
        <View style={s.form}>
          <TextInput accessibilityLabel="Payment name" placeholder="Name, e.g. Rent" placeholderTextColor={colors.muted} value={name} onChangeText={setName} style={s.nameInput} />
          <View style={s.kinds}>{(['Bill', 'Loan', 'Subscription'] as const).map((k) => (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ selected: kind === k }} onPress={() => setKind(k)} style={[s.kind, kind === k && { backgroundColor: ob.ink }]}><Text style={[s.kindT, kind === k && { color: colors.white }]}>{k}</Text></Pressable>
          ))}</View>
          <Row title="Monthly amount"><AmountInput label="Monthly amount" value={amt} onChange={setAmt} /></Row>
          <BigButton title="Add payment" disabled={!name.trim() || !amt} onPress={save} />
        </View>
      ) : <DashedAdd label={draft.regular.length ? '+ Have a loan or payment we missed?' : '+ Add a regular payment'} onPress={() => setOpen(true)} />}
    </StepFrame>
  );
}

/* ---------- Step 4 ---------- */
function Usual({ n, draft, set, onBack, onNext }: P) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(''); const [amt, setAmt] = useState(0);
  const max = Math.max(1, ...draft.usual.map((u) => u.monthly));
  const save = () => { if (!name.trim() || !amt) return; set({ usual: [...draft.usual, { id: uid(), name: name.trim(), monthly: amt, on: true }] }); setName(''); setAmt(0); setOpen(false); };
  return (
    <StepFrame step={n} title="What you usually spend" subtitle="Add the everyday categories you spend on. Each one you keep becomes an envelope." onBack={onBack}
      footer={<><CostFooter regular={regularTotal(draft)} everyday={usualTotal(draft)} /><BigButton title="Continue" onPress={onNext} /></>}>
      {draft.usual.map((u) => (
        <View key={u.id} style={s.usualRow}>
          <Row title={u.name} note={u.payments ? `about ${u.payments} payments a month` : 'Usual month'}>
            <Text style={[s.amt, !u.on && s.struck]}>{formatMoney(u.monthly)}</Text>
            <View style={{ width: 10 }} /><Switch label={`Keep ${u.name}`} value={u.on} onChange={(v) => set({ usual: draft.usual.map((x) => (x.id === u.id ? { ...x, on: v } : x)) })} />
          </Row>
          <View style={s.track}><View style={[s.fill, { width: `${(u.monthly / max) * 100}%` }]} /></View>
        </View>
      ))}
      {open ? (
        <View style={s.form}>
          <TextInput accessibilityLabel="Envelope name" placeholder="Name, e.g. Groceries" placeholderTextColor={colors.muted} value={name} onChangeText={setName} style={s.nameInput} />
          <Row title="Usual month"><AmountInput label="Usual monthly amount" value={amt} onChange={setAmt} /></Row>
          <BigButton title="Add envelope" disabled={!name.trim() || !amt} onPress={save} />
        </View>
      ) : <DashedAdd label="+ Your own envelope" onPress={() => setOpen(true)} />}
    </StepFrame>
  );
}

/* ---------- Step 5 ---------- */
function Yearly({ n, draft, set, onBack, onNext }: P) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(''); const [amt, setAmt] = useState(0);
  const count = wants(draft).length;
  const save = () => { if (!name.trim() || !amt) return; set({ yearly: [...draft.yearly, { id: uid(), name: name.trim(), when: 'Once a year', perYear: amt, on: true }] }); setName(''); setAmt(0); setOpen(false); };
  return (
    <StepFrame step={n} title="Anything that happens a few times a year?" subtitle="Big costs that don't come every month. Put a little aside each month and they never catch you off guard." onBack={onBack}
      footer={<><CostFooter regular={regularTotal(draft)} everyday={usualTotal(draft)} yearly={yearlyMonthly(draft)} /><BigButton title={count ? `Continue with ${count} envelopes` : 'Continue'} disabled={!count} onPress={onNext} /></>}>
      {draft.yearly.map((y) => (
        <View key={y.id} style={s.yRow}>
          <Row title={y.name} note={y.when}>
            {y.on ? <Text style={s.perMo}>{formatMoney(monthlySaving(y.perYear))}/mo</Text> : null}
            <View style={{ width: 10 }} /><Switch label={`Save for ${y.name}`} value={y.on} onChange={(v) => set({ yearly: draft.yearly.map((x) => (x.id === y.id ? { ...x, on: v } : x)) })} />
          </Row>
          {y.on ? <Row title="About this much a year"><AmountInput label={`${y.name} per year`} value={y.perYear} width={140} onChange={(v) => set({ yearly: draft.yearly.map((x) => (x.id === y.id ? { ...x, perYear: v } : x)) })} /></Row> : null}
        </View>
      ))}
      {open ? (
        <View style={s.form}>
          <TextInput accessibilityLabel="Name" placeholder="Name, e.g. New laptop" placeholderTextColor={colors.muted} value={name} onChangeText={setName} style={s.nameInput} />
          <Row title="About this much a year"><AmountInput label="Amount per year" value={amt} width={140} onChange={setAmt} /></Row>
          <BigButton title="Add" disabled={!name.trim() || !amt} onPress={save} />
        </View>
      ) : <DashedAdd label="+ Something else" onPress={() => setOpen(true)} />}
    </StepFrame>
  );
}

/* ---------- Step 6 ---------- */
function Assign({ n, draft, assigned, setAssigned, onBack, onDone }: { n: number; draft: Draft; assigned: Record<string, number>; setAssigned: (a: Record<string, number>) => void; onBack: () => void; onDone: () => void }) {
  const [filledNote, setFilledNote] = useState<string | null>(null);
  const have = moneyToPlan(draft);
  const cost = monthCost(draft);
  const left = have - assignedTotal(assigned);
  const w = wants(draft);
  const fill = () => { const r = fillWhatFits(draft); setAssigned(r.filled); setFilledNote(r.shortfall > 0 ? `Filled what fits. ${formatMoney(r.shortfall)} short this month, add it when your salary arrives.` : 'Filled every envelope.'); };
  const group = (g: string, label: string, right?: string) => {
    const items = w.filter((x) => x.group === g);
    if (!items.length) return null;
    return (
      <View key={g}>
        <SectionHead title={label} right={right} />
        {items.map((x) => (
          <Row key={x.id} title={x.name} note={g === 'Everyday' ? `Usually ${formatMoney(x.amount)}` : g === 'Once in a while' ? 'Saved monthly' : 'Every month'}>
            <AmountInput label={`${x.name} amount`} value={assigned[x.id] ?? 0} onChange={(v) => setAssigned({ ...assigned, [x.id]: v })} />
          </Row>
        ))}
      </View>
    );
  };
  return (
    <StepFrame step={n} title="Give your money a job" onBack={onBack}
      footer={<BigButton title="Start planning" disabled={left < 0 || assignedTotal(assigned) === 0} onPress={onDone} />}>
      <View style={[s.card, { marginTop: 12 }]}>
        <Text style={s.cardL}>READY TO ASSIGN</Text>
        <Text style={[s.cardBig, left < 0 && { color: colors.accent }]}>{formatMoney(left)}</Text>
        <Text style={s.rowN}>{left === 0 ? 'Every tögrög has a job.' : left < 0 ? 'You assigned more than you have.' : 'Still waiting for a job.'}</Text>
      </View>
      <View style={s.two}>
        <View style={[s.card, { flex: 1 }]}><Text style={s.rowN}>You have</Text><Text style={s.cardMid}>{formatMoney(have)}</Text></View>
        <View style={[s.card, { flex: 1 }]}><Text style={s.rowN}>Your month costs about</Text><Text style={s.cardMid}>{formatMoney(cost)}</Text></View>
      </View>
      {cost > have ? <View style={s.note}><Text style={s.noteText}>You have {formatMoney(cost - have)} less than a month costs. That's normal at the start: plan what you have now, and add the rest when money comes in.</Text></View> : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Fill with usual amounts" onPress={fill} style={s.fillBtn}><Text style={s.fillT}>Fill with usual amounts</Text></Pressable>
      {filledNote ? <Text accessibilityLiveRegion="polite" style={s.filledNote}>{filledNote}</Text> : null}
      {group('Bills', 'REGULAR PAYMENTS')}
      {group('Once in a while', 'ONCE IN A WHILE', 'saved monthly')}
      {group('Everyday', 'EVERYDAY', 'usual month')}
    </StepFrame>
  );
}

/* ---------- Plan ready ---------- */
function Ready({ draft, assigned, onOpen, onRestart }: { draft: Draft; assigned: Record<string, number>; onOpen: () => void; onRestart: () => void }) {
  const st = useStore();
  const w = wants(draft);
  const everyday = w.filter((x) => x.group === 'Everyday').reduce((a, x) => a + (assigned[x.id] ?? 0), 0);
  const days = Math.max(1, st.today.monthDays - st.today.day);
  const safe = safeToSpend(everyday, st.today.day, st.today.monthDays, st.today.weekday).today;
  const envCount = w.length;
  const regularCount = draft.regular.filter((r) => r.on).length;
  return (
    <Poster>
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={s.readyLogo}>xypa</Text>
        <Text style={s.readyTitle} accessibilityRole="header">Your plan is ready</Text>
        <View style={s.dark}><Text style={s.darkL}>Safe to spend today</Text><Text style={s.darkBig}>{formatMoney(safe)}</Text><Text style={s.darkL}>Everyday envelopes ÷ {days} days left</Text></View>
        <View style={s.two}>
          <View style={s.glass}><Text style={s.rowN}>Envelopes</Text><Text style={s.cardMid}>{envCount}</Text></View>
          <View style={s.glass}><Text style={s.rowN}>Assigned</Text><Text style={s.cardMid}>{formatMoney(assignedTotal(assigned))}</Text></View>
        </View>
        {regularCount ? <View style={s.glassWide}><Text style={s.noteText}>We'll remind you a day before your {regularCount} regular payments go out.</Text></View> : null}
        <View style={s.glassWide}><Text style={s.noteText}>If an envelope runs over, move money from another one. Whatever you don't spend rolls into next month.</Text></View>
      </View>
      <BigButton title="Open my plan" onPress={onOpen} />
      <Pressable accessibilityRole="button" accessibilityLabel="Start onboarding again" onPress={onRestart} style={s.link}><Text style={s.linkText}>Start onboarding again</Text></Pressable>
    </Poster>
  );
}

const s = StyleSheet.create({
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontFamily: font.medium, fontSize: 28, letterSpacing: -0.8, color: ob.ink },
  index: { fontFamily: font.medium, fontSize: 16, color: ob.ink },
  fan: { height: 190, marginTop: 56 },
  envCard: { position: 'absolute', width: 160, height: 108, borderRadius: 14, backgroundColor: '#FCF4EB', borderWidth: 1, borderColor: ob.ink, padding: 14, justifyContent: 'flex-end', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  envLabel: { fontFamily: font.medium, fontSize: 14, color: ob.ink },
  envValue: { fontFamily: font.medium, fontSize: 19, letterSpacing: -0.5, color: ob.ink },
  hello: { fontFamily: font.medium, fontSize: 46, lineHeight: 50, letterSpacing: -2, color: ob.ink },
  helloSub: { fontFamily: font.regular, fontSize: 17, lineHeight: 25, color: colors.ink2, marginTop: 14 },
  google: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 60, borderRadius: 999, backgroundColor: ob.ink },
  g: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  gText: { fontFamily: font.medium, fontSize: 15, color: ob.ink },
  googleText: { fontFamily: font.medium, fontSize: 18, color: colors.white },
  login: { fontFamily: font.regular, fontSize: 14, color: colors.ink2, textAlign: 'center', marginTop: 14, lineHeight: 20 },
  soon: { fontFamily: font.regular, fontSize: 13, color: colors.muted, textAlign: 'center' },
  link: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontFamily: font.medium, fontSize: 16, color: ob.ink },
  li: { fontFamily: font.regular, fontSize: 17, color: ob.ink, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowT: { fontFamily: font.medium, fontSize: 17, color: ob.ink },
  rowN: { fontFamily: font.regular, fontSize: 14, color: colors.ink2, marginTop: 2 },
  amt: { fontFamily: font.medium, fontSize: 17, color: ob.ink, fontVariant: ['tabular-nums'] },
  struck: { textDecorationLine: 'line-through', color: colors.muted },
  perMo: { fontFamily: font.regular, fontSize: 14, color: colors.ink2 },
  addRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  nameInput: { flex: 1, fontFamily: font.regular, fontSize: 17, color: ob.ink, backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.line, minHeight: 52, paddingHorizontal: 16 },
  addBtn: { minHeight: 52, minWidth: 72, borderRadius: 26, borderWidth: 1.5, borderColor: ob.ink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  addText: { fontFamily: font.medium, fontSize: 16, color: ob.ink },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1.5, borderTopColor: ob.ink, marginTop: 14, paddingTop: 14 },
  totalL: { fontFamily: font.medium, fontSize: 17, color: ob.ink },
  totalV: { fontFamily: font.medium, fontSize: 26, letterSpacing: -0.8, color: ob.ink },
  note: { backgroundColor: '#EEEBE5', borderRadius: 18, padding: 16, marginTop: 16 },
  noteText: { fontFamily: font.regular, fontSize: 16, lineHeight: 23, color: ob.ink },
  form: { gap: 12, marginTop: 16 },
  kinds: { flexDirection: 'row', gap: 8 },
  kind: { minHeight: 44, borderRadius: 22, backgroundColor: colors.chip, paddingHorizontal: 16, justifyContent: 'center' },
  kindT: { fontFamily: font.medium, fontSize: 14, color: ob.ink },
  usualRow: { borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 12 },
  track: { height: 6, borderRadius: 3, backgroundColor: '#DDDAD4', overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3, backgroundColor: ob.ink },
  yRow: { borderBottomWidth: 1, borderBottomColor: colors.line },
  card: { backgroundColor: colors.white, borderRadius: 22, padding: 16, borderWidth: 1, borderColor: colors.line },
  cardL: { fontFamily: font.medium, fontSize: 12, letterSpacing: 1.4, color: ob.ink },
  cardBig: { fontFamily: font.medium, fontSize: 40, letterSpacing: -1.5, color: ob.ink, marginTop: 4 },
  cardMid: { fontFamily: font.medium, fontSize: 20, letterSpacing: -0.5, color: ob.ink, marginTop: 4 },
  two: { flexDirection: 'row', gap: 10, marginTop: 10 },
  fillBtn: { alignSelf: 'flex-start', minHeight: 48, borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 20, justifyContent: 'center', marginTop: 14 },
  fillT: { fontFamily: font.medium, fontSize: 15, color: ob.ink },
  filledNote: { fontFamily: font.regular, fontSize: 14, color: colors.accentInk, marginTop: 10, lineHeight: 20 },
  readyLogo: { fontFamily: font.medium, fontSize: 44, letterSpacing: -1.5, color: ob.ink, textAlign: 'center' },
  readyTitle: { fontFamily: font.medium, fontSize: 30, letterSpacing: -1, color: ob.ink, textAlign: 'center', marginTop: 6, marginBottom: 14 },
  dark: { backgroundColor: ob.ink, borderRadius: 24, padding: 20, gap: 6 },
  darkL: { fontFamily: font.regular, fontSize: 15, color: '#E8E4DC' },
  darkBig: { fontFamily: font.medium, fontSize: 38, letterSpacing: -1.4, color: colors.white },
  glass: { flex: 1, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  glassWide: { backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 20, padding: 16, marginTop: 10 },
});
