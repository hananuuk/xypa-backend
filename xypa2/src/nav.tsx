import { createContext, useContext } from 'react';

/** Full-screen routes that sit on top of a tab. The tab bar is hidden on focused flows. */
export type Route =
  | { name: 'envelope'; id: string }
  | { name: 'assign' }
  | { name: 'review' }
  | { name: 'goal'; id: string }
  | { name: 'account'; id: string }
  | { name: 'editHome' }
  | { name: 'newMonth' }
  | { name: 'settings' }
  | { name: 'txnList'; title: string; month: string; envelopeId?: string; merchant?: string }
  | { name: 'ask' }
  | { name: 'importStatement' }
  | { name: 'sortMerchants' };

/** Bottom sheets opened from anywhere. */
export type Sheet =
  | { name: 'cover'; id: string }
  | { name: 'addTxn'; envelopeId?: string }
  | { name: 'safeExplain' }
  | { name: 'monthPicker' }
  | { name: 'newEnvelope' }
  | { name: 'moveIn'; id: string }
  | { name: 'newGoal' }
  | { name: 'addGoalMoney'; id: string }
  | { name: 'addAccount' }
  | { name: 'day'; day: number }
  | { name: 'txn'; id: string }
  | { name: 'fixSync'; id: string }
  | { name: 'confirmDeleteGoal'; id: string }
  | { name: 'currency' }
  | { name: 'language' }
  | { name: 'editName' }
  | { name: 'confirmLogOut' }
  | { name: 'gmail' };

export type Nav = {
  push: (r: Route) => void;
  back: () => void;
  openSheet: (s: Sheet) => void;
  closeSheet: () => void;
};

export const NavContext = createContext<Nav | null>(null);
export const useNav = () => {
  const n = useContext(NavContext);
  if (!n) throw new Error('useNav outside NavContext');
  return n;
};

/** Routes that hide the tab bar (spec §3.1). */
export const hidesTabBar = (r: Route | undefined) => !!r && (r.name === 'assign' || r.name === 'review' || r.name === 'editHome' || r.name === 'newMonth' || r.name === 'ask' || r.name === 'importStatement' || r.name === 'sortMerchants');
