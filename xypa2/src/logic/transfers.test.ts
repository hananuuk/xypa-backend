import { describe, expect, it } from 'vitest';
import { parseGolomtStatement, parseMbankStatement, transferInfo } from './bankStatements';
import { Found, linkOwnTransfers, txnsFromScan } from './scan';
import type { Txn } from './types';

describe('transferInfo', () => {
  const owner = ['МАГСАРЖАВ', 'АНУУХАН'];
  it('incoming from someone else names them', () => {
    expect(transferInfo('АНУНГОО-С ИЛГЭЭВ.', 'income', owner)).toEqual({ merchant: 'From Анунгоо', transfer: 'person' });
  });
  it('incoming from your own name is between your accounts', () => {
    expect(transferInfo('АНУУХАН-С ИЛГЭЭВ-МАГСАРЖАВ АНУУХАН', 'income', owner)?.transfer).toBe('own');
  });
  it('outgoing uses the receiving account tail', () => {
    expect(transferInfo('Ануухан-с илгээв', 'spend', owner, '03504088')).toEqual({ merchant: 'To ··4088', transfer: 'person' });
  });
  it('card payments and bank fees are not transfers', () => {
    expect(transferInfo('4207********1728:TLJ CENTRAL', 'spend', owner)).toBeNull();
    expect(transferInfo('М БАНК- Банк хооронд шимтгэл', 'spend', owner)).toBeNull();
  });
});

describe('linkOwnTransfers', () => {
  const t = (id: string, type: 'spend' | 'income', accountId: string, date: string): Txn =>
    ({ id, envelopeId: null, merchant: 'x', amount: 50000, type, date, accountId, source: 'statement', kind: 'person' });
  it('pairs the same amount across two accounts within a day', () => {
    const r = linkOwnTransfers([t('a', 'spend', 'm', '2026-11-02'), t('b', 'income', 'g', '2026-11-03'), t('c', 'spend', 'm', '2026-11-09')]);
    expect(r.map((x) => x.kind)).toEqual(['own', 'own', 'person']);
  });
  it('does not pair within one account', () => {
    expect(linkOwnTransfers([t('a', 'spend', 'm', '2026-11-02'), t('b', 'income', 'm', '2026-11-02')]).every((x) => x.kind === 'person')).toBe(true);
  });
  it('transfers never land in an envelope and skip the older-month filter only when own', () => {
    const f: Found[] = [{ bank: 'M bank', card: null, merchant: 'To ··4088', amount: 6000, type: 'spend', date: '2026-08-09', balance: null, transfer: 'person' }];
    expect(txnsFromScan(f, [], [], '2026-11')).toHaveLength(0);
    expect(txnsFromScan(f, [], [])[0].kind).toBe('person');
  });
});
