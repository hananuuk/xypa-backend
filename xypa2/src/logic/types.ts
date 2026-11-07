// Data model from the xypa 2.0 spec (§5.1). Amounts are whole tögrög.

export type EnvelopeGroup = 'Everyday' | 'Bills' | 'Once in a while' | (string & {});

export type Envelope = {
  id: string;
  name: string;
  group: EnvelopeGroup;
  /** Assigned to this envelope (including rolled-over money). */
  budget: number;
  /** Monthly target; 0 = no target. */
  target: number;
  color: string;
};

export type Txn = {
  id: string;
  /** null = not sorted yet (shows up in Review). */
  envelopeId: string | null;
  merchant: string;
  /** Always positive. `type` says which way the money moved. */
  amount: number;
  type: 'spend' | 'income';
  /** ISO date, YYYY-MM-DD. */
  date: string;
  accountId: string;
  source: 'gmail' | 'statement' | 'manual';
  /** 'own' = moved between your own accounts (not spending or income); 'person' = money sent to or received from someone, not a purchase. */
  kind?: 'own' | 'person';
};

export type AccountKind = 'Checking' | 'Wallet' | 'Credit' | 'Savings' | 'Loan';

export type Account = {
  id: string;
  name: string;
  kind: AccountKind;
  balance: number;
  syncOk: boolean;
  lastSync?: string;
};

export type Goal = {
  id: string;
  name: string;
  saved: number;
  target: number;
  monthly: number;
  addedThisMonth: number;
  /** ISO month, YYYY-MM. */
  by: string;
};

export type MerchantRule = { merchant: string; envelopeId: string };

export type CoverSource =
  | { kind: 'rta'; amount: number }
  | { kind: 'envelope'; envelopeId: string; amount: number };
