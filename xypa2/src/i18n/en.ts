// Every user-facing string lives here so Mongolian can be added later without touching screens.
export const en = {
  tabs: { plan: 'Plan', goals: 'Goals', reflect: 'Reflect', accounts: 'Accounts', add: 'Add transaction' },
  plan: {
    toReview: 'To review',
    hideAmounts: 'Hide amounts',
    showAmounts: 'Show amounts',
    readyToAssign: 'Ready to Assign',
    assign: 'Assign',
    adjust: 'Adjust',
    allAssigned: 'All assigned',
    everyTogrogHasAJob: 'Every tögrög has a job',
    safeToSpend: 'Safe to spend',
    today: 'today',
    thisWeek: 'this week',
    thisMonth: 'this month',
    dayOf: (d: number, n: number, left: number) => `Day ${d} of ${n} · ${left} days to go`,
    envelopes: 'Envelopes',
    left: 'left',
    cover: 'Cover',
    funded: 'Funded',
    needs: (amount: string) => `Needs ${amount}`,
    newEnvelope: 'New envelope',
    customize: 'Customize home',
    assigned: (amount: string) => `of ${amount} assigned`,
    overspent: (name: string, amount: string) => `${name}, overspent by ${amount}`,
    percentLeft: (p: number) => `${p}% left`,
  },
  common: { done: 'Done', cancel: 'Cancel', close: 'Close', undo: 'Undo', save: 'Save' },
} as const;

export type Strings = typeof en;
export const t = en;
