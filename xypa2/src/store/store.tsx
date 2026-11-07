import AsyncStorage from '@react-native-async-storage/async-storage';
import { tr, setLang, deviceLang } from '../i18n';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyCover, autoFile, normalizeCover, readyToAssign, refile, viewEnvelopes, everydayLeft, safeToSpend, deleteGoal,
} from '../logic/budget';
import type { Account, CoverSource, Envelope, Goal, MerchantRule, Txn } from '../logic/types';
import { CurrencyCode, setCurrency } from '../logic/money';
import { ImportResult, planImport } from '../logic/importStatement';
import type { Found } from '../logic/scan';
import { getToday } from './calendar';
import { seedAccounts, seedEnvelopes, seedGoals, seedRules, seedTxns } from './seed';

const KEY = 'xypa2:state:v1';

export type HomeCard = 'notes' | 'rta' | 'safe' | 'envs';
export type Checklist = { sort: boolean; cover: boolean; check: boolean; assign: boolean };

export type Persisted = {
  accounts: Account[]; envelopes: Envelope[]; txns: Txn[]; goals: Goal[]; rules: MerchantRule[];
  hideAmounts: boolean; homeOrder: HomeCard[]; homeHidden: Partial<Record<HomeCard, boolean>>;
  checklist: Checklist; envView: 'list' | 'grid';
  /** Missing (older saves) counts as onboarded; false means show onboarding. */
  onboarded?: boolean;
  profile?: { name: string; email?: string; gmail?: boolean };
  currency?: CurrencyCode;
  language?: 'en' | 'mn';
  notify?: { overspend: boolean; newTxns: boolean; morning: boolean };
  /** Preview switch for the Pro assistant. Missing counts as on while Pro is in preview. */
  pro?: boolean;
};

const defaults = (): Persisted => ({
  accounts: seedAccounts, envelopes: seedEnvelopes, txns: seedTxns(getToday()), goals: seedGoals, rules: seedRules,
  hideAmounts: false, homeOrder: ['notes', 'rta', 'safe', 'envs'], homeHidden: {},
  checklist: { sort: false, cover: false, check: false, assign: false }, envView: 'list',
});

export type ToastMsg = { id: number; message: string; onUndo?: () => void };

type Store = Persisted & {
  ready: boolean;
  today: ReturnType<typeof getToday>;
  month: string;
  views: ReturnType<typeof viewEnvelopes>;
  rta: number;
  safe: ReturnType<typeof safeToSpend>;
  unsorted: Txn[];
  toast: ToastMsg | null;
  dismissToast: () => void;
  setHideAmounts: (v: boolean) => void;
  setEnvView: (v: 'list' | 'grid') => void;
  markChecklist: (k: keyof Checklist) => void;
  /** Assign: set new budgets for several envelopes at once. */
  assign: (budgets: Record<string, number>) => void;
  cover: (targetId: string, sources: CoverSource[]) => void;
  addEnvelope: (e: Omit<Envelope, 'id' | 'budget' | 'color'> & { budget?: number }) => void;
  addTxn: (t: Omit<Txn, 'id' | 'source'>) => void;
  /** File every unsorted purchase from one merchant, and remember it for next time. */
  fileMerchant: (merchant: string, envelopeId: string) => void;
  fileTxn: (txnId: string, envelopeId: string, rule?: boolean) => void;
  addGoalMoney: (goalId: string, amount: number) => void;
  removeGoal: (goalId: string) => void;
  addGoal: (g: Omit<Goal, 'id' | 'saved' | 'addedThisMonth'>) => void;
  fixBalance: (accountId: string, balance: number) => void;
  addAccount: (a: Pick<Account, 'name' | 'kind' | 'balance'>) => void;
  setHomeLayout: (order: HomeCard[], hidden: Partial<Record<HomeCard, boolean>>) => void;
  startOnboarding: () => void;
  setProfileName: (name: string) => void;
  setSession: (me: { email: string; name: string | null; gmailConnected: boolean }) => void;
  setCurrencyCode: (c: CurrencyCode) => void;
  setLanguage: (l: 'en' | 'mn') => void;
  setPro: (v: boolean) => void;
  /** Add a statement's accounts and transactions after setup. Skips what is already here. */
  importStatement: (found: Found[]) => ImportResult;
  setNotify: (k: 'overspend' | 'newTxns' | 'morning', v: boolean) => void;
  logOut: () => void;
  completeOnboarding: (plan: { accounts: Account[]; envelopes: Envelope[]; txns?: Txn[] }) => void;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(defaults);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const toastId = useRef(0);
  const today = useMemo(() => getToday(), []);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) { try { { const saved = { ...defaults(), ...JSON.parse(raw) } as Persisted; setState({ ...saved, accounts: saved.accounts.filter((a) => !(a.id === 'cash' && a.balance === 0 && !saved.txns.some((t) => t.accountId === 'cash'))) }); } } catch { /* corrupt save: keep defaults */ } }
    }).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
  }, [state, ready]);

  const showToast = useCallback((message: string, prev?: Persisted) => {
    toastId.current += 1;
    setToast({ id: toastId.current, message, onUndo: prev ? () => setState(prev) : undefined });
  }, []);

  /** Run an undoable change: snapshot, apply, show a toast with Undo. */
  const change = useCallback((message: string, fn: (s: Persisted) => Persisted) => {
    setState((cur) => { const next = fn(cur); showToast(message, cur); return next; });
  }, [showToast]);

  setCurrency(state.currency ?? 'MNT');
  setLang(state.language ?? deviceLang());
  const month = today.month;
  const views = useMemo(() => viewEnvelopes(state.envelopes, state.txns, month), [state.envelopes, state.txns, month]);
  const rta = useMemo(() => readyToAssign(state.accounts, views, state.goals), [state.accounts, views, state.goals]);
  const safe = useMemo(() => safeToSpend(everydayLeft(views), today.day, today.monthDays, today.weekday), [views, today]);
  const unsorted = useMemo(() => state.txns.filter((t) => t.envelopeId === null && t.kind !== 'own'), [state.txns]);

  const store: Store = {
    ...state, ready, today, month, views, rta, safe, unsorted, toast,
    dismissToast: () => setToast(null),
    setHideAmounts: (v) => setState((s) => ({ ...s, hideAmounts: v })),
    setEnvView: (v) => setState((s) => ({ ...s, envView: v })),
    markChecklist: (k) => setState((s) => (s.checklist[k] ? s : { ...s, checklist: { ...s.checklist, [k]: true } })),
    assign: (budgets) => change('Assigned', (s) => ({
      ...s, envelopes: s.envelopes.map((e) => (e.id in budgets ? { ...e, budget: budgets[e.id] } : e)),
    })),
    cover: (targetId, sources) => change('Covered', (s) => {
      const v = viewEnvelopes(s.envelopes, s.txns, month);
      const need = Math.max(0, -(v.find((e) => e.id === targetId)?.left ?? 0));
      const has = (src: CoverSource) => src.kind === 'rta'
        ? Math.max(0, readyToAssign(s.accounts, v, s.goals))
        : Math.max(0, v.find((e) => e.id === src.envelopeId)?.left ?? 0);
      const clean = normalizeCover(sources, need, has);
      return { ...s, envelopes: applyCover(s.envelopes, targetId, clean), checklist: { ...s.checklist, cover: true } };
    }),
    addEnvelope: (e) => change(tr('{0} added', e.name), (s) => ({
      ...s, envelopes: [...s.envelopes, { ...e, id: `env-${Date.now()}`, budget: e.budget ?? 0, color: ['#D9774A', '#2E9E72', '#4A8CC9', '#B8901A', '#7A6BD6', '#5F8A99', '#A0699B'][s.envelopes.length % 7] }],
    })),
    addTxn: (t) => change('Transaction added', (s) => ({
      ...s,
      txns: autoFile([...s.txns, { ...t, id: `txn-${Date.now()}`, source: 'manual' }], s.rules),
      accounts: s.accounts.map((a) => (a.id === t.accountId ? { ...a, balance: a.balance + (t.type === 'spend' ? -t.amount : t.amount) } : a)),
    })),
    fileMerchant: (merchant, envelopeId) => change('Sorted', (s) => ({
      ...s,
      txns: s.txns.map((t) => (t.merchant === merchant && t.envelopeId === null && t.type === 'spend' && !t.kind ? { ...t, envelopeId } : t)),
      rules: s.rules.some((r) => r.merchant === merchant) ? s.rules : [...s.rules, { merchant, envelopeId }],
      checklist: { ...s.checklist, sort: true },
    })),
    fileTxn: (txnId, envelopeId, rule) => change('Filed', (s) => {
      const txn = s.txns.find((t) => t.id === txnId);
      const rules = rule && txn && !s.rules.some((r) => r.merchant === txn.merchant) ? [...s.rules, { merchant: txn.merchant, envelopeId }] : s.rules;
      return { ...s, txns: refile(s.txns, txnId, envelopeId), rules, checklist: { ...s.checklist, sort: true } };
    }),
    addGoalMoney: (goalId, amount) => change('Added to goal', (s) => ({
      ...s, goals: s.goals.map((g) => (g.id === goalId ? { ...g, saved: g.saved + amount, addedThisMonth: g.addedThisMonth + amount } : g)),
    })),
    removeGoal: (goalId) => change('Goal deleted, money returned to Ready to Assign', (s) => ({ ...s, goals: deleteGoal(s.goals, goalId) })),
    addGoal: (g) => change(tr('{0} added', g.name), (s) => ({ ...s, goals: [...s.goals, { ...g, id: `goal-${Date.now()}`, saved: 0, addedThisMonth: 0 }] })),
    fixBalance: (accountId, balance) => change('Balance updated', (s) => ({ ...s, accounts: s.accounts.map((a) => (a.id === accountId ? { ...a, balance, syncOk: true } : a)) })),
    addAccount: (a) => change(tr('{0} added', a.name), (s) => ({ ...s, accounts: [...s.accounts, { ...a, id: `acc-${Date.now()}`, syncOk: true }] })),
    setProfileName: (name) => setState((s) => ({ ...s, profile: { ...s.profile, name } })),
    setSession: (me) => setState((s) => ({ ...s, profile: { name: s.profile?.name || me.name || '', email: me.email, gmail: me.gmailConnected } })),
    setCurrencyCode: (c) => setState((s) => ({ ...s, currency: c })),
    setLanguage: (l) => setState((s) => ({ ...s, language: l })),
    importStatement: (found) => {
      const r = planImport(found, state.accounts, state.envelopes, state.txns, state.rules, month);
      if (r.added > 0 || r.newAccounts.length > 0) {
        change(tr('{0} transactions added', r.added), (s) => ({ ...s, accounts: r.accounts, txns: r.txns }));
      }
      return r;
    },
    setPro: (v) => setState((s) => ({ ...s, pro: v })),
    setNotify: (k, v) => setState((s) => ({ ...s, notify: { overspend: true, newTxns: true, morning: false, ...s.notify, [k]: v } })),
    logOut: () => { setToast(null); setState({ ...defaults(), onboarded: false, profile: undefined }); },
    startOnboarding: () => setState((s) => ({ ...s, onboarded: false })),
    completeOnboarding: (plan) => setState((s) => ({
      ...s, accounts: plan.accounts, envelopes: plan.envelopes, txns: plan.txns ?? [], goals: [], rules: [],
      homeOrder: ['notes', 'rta', 'safe', 'envs'], homeHidden: {}, checklist: { sort: false, cover: false, check: false, assign: false }, onboarded: true,
    })),
    setHomeLayout: (order, hidden) => setState((s) => ({ ...s, homeOrder: order, homeHidden: hidden })),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
