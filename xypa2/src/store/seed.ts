import { envelopeColors } from '../design/tokens';
import type { Account, Envelope, Goal, MerchantRule, Txn } from '../logic/types';
import type { Today } from './calendar';

// Demo data that reproduces the Plan screenshot: Ready to Assign 420,000₮, Dining Out overspent by 36,200₮,
// Everyday 527,400₮ left, Bills 1,250,000₮ left, safe to spend ≈ 20,800₮ on day 3 of 30.

export const seedAccounts: Account[] = [
  { id: 'mbank', name: 'M bank', kind: 'Checking', balance: 2717400, syncOk: true, lastSync: 'Today' },
  { id: 'golomt', name: 'Golomt', kind: 'Checking', balance: 480000, syncOk: false, lastSync: '6 days ago' },
];

export const seedEnvelopes: Envelope[] = [
  { id: 'dining', name: 'Dining Out', group: 'Everyday', budget: 80000, target: 80000, color: envelopeColors.Dining },
  { id: 'groceries', name: 'Groceries', group: 'Everyday', budget: 700000, target: 700000, color: envelopeColors.Groceries },
  { id: 'transport', name: 'Transport', group: 'Everyday', budget: 100000, target: 100000, color: envelopeColors.Transport },
  { id: 'coffee', name: 'Coffee', group: 'Everyday', budget: 80000, target: 80000, color: envelopeColors.Coffee },
  { id: 'rent', name: 'Rent', group: 'Bills', budget: 1200000, target: 1200000, color: envelopeColors.Rent },
  { id: 'phone', name: 'Phone', group: 'Bills', budget: 0, target: 40000, color: envelopeColors.Phone },
  { id: 'internet', name: 'Internet', group: 'Bills', budget: 50000, target: 50000, color: envelopeColors.Internet },
];

export const seedGoals: Goal[] = [
  { id: 'cake', name: 'Cake stand', saved: 120000, target: 300000, monthly: 30000, addedThisMonth: 30000, by: '2027-03' },
  { id: 'fund', name: 'Emergency fund', saved: 880000, target: 9000000, monthly: 750000, addedThisMonth: 0, by: '2027-10' },
];

export const seedRules: MerchantRule[] = [];

export function seedTxns(today: Today): Txn[] {
  const d = (n: number) => `${today.month}-${String(Math.min(n, Math.max(1, today.day))).padStart(2, '0')}`;
  const t = (id: string, envelopeId: string | null, merchant: string, amount: number, day: number): Txn => ({
    id, envelopeId, merchant, amount, type: 'spend', date: d(day), accountId: 'mbank', source: 'gmail',
  });
  return [
    t('s1', 'dining', 'Pizzeria Mario', 70200, 1),
    t('s2', 'dining', 'Hotpot House', 46000, 2),
    t('s3', 'groceries', 'Nomin Supermarket', 160000, 1),
    t('s4', 'groceries', 'Emart', 79400, 2),
    t('s5', 'transport', 'Taxi', 15000, 2),
    t('s6', 'coffee', 'Tom n Toms', 62000, 1),
    t('s7', null, 'Nomin Supermarket', 48600, 3),
    t('s8', null, 'Khan Bank ATM fee', 1500, 3),
    t('s9', null, 'Steppe Coffee', 9800, 3),
  ];
}
