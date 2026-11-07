import { describe, expect, it } from 'vitest';
import { dedupe, parseRows, parseText, toIsoDate } from './statement';

describe('statement', () => {
  it('reads dates in common shapes', () => {
    expect(toIsoDate('2026-11-05 12:40')).toBe('2026-11-05');
    expect(toIsoDate('05.11.2026')).toBe('2026-11-05');
    expect(toIsoDate('2026/11/5')).toBe('2026-11-05');
    expect(toIsoDate(46331)).toMatch(/^2026-/);
    expect(toIsoDate('hello')).toBeNull();
  });
  it('reads debit/credit columns in Mongolian', () => {
    const rows = [['Хуулга'], ['Огноо', 'Гүйлгээний утга', 'Зарлага', 'Орлого', 'Үлдэгдэл'],
      ['2026-11-05', '4207********1728:NOMIN SUPERMARKET', '48,600.00', '0.00', '2,301,400.00'],
      ['2026-11-01', 'Ануухан-с илгээв', '0.00', '3,200,000.00', '2,350,000.00']];
    const f = parseRows(rows, 'M bank');
    expect(f).toHaveLength(2);
    expect(f[0]).toMatchObject({ merchant: 'NOMIN SUPERMARKET', amount: 48600, type: 'spend', balance: 2301400, bank: 'M bank' });
    expect(f[1]).toMatchObject({ amount: 3200000, type: 'income' });
  });
  it('uses the balance to tell direction when there is one amount column', () => {
    const rows = [['Date', 'Description', 'Amount', 'Balance'],
      ['2026-11-01', 'Salary', '3,200,000', '3,500,000'], ['2026-11-02', 'Nomin', '50,000', '3,450,000']];
    const f = parseRows(rows, 'Khan Bank');
    expect(f.map((x) => x.type)).toEqual(['income', 'spend']); // later rows use the falling balance
  });
  it('reads text lines from a PDF', () => {
    const text = '2026-11-01 Salary 0.00 3,200,000.00 3,500,000.00\n2026-11-02 NOMIN SUPERMARKET 48,600.00 0.00 3,451,400.00\nPage 1 of 2';
    const f = parseText(text, 'M bank');
    expect(f).toHaveLength(2);
    expect(f[0]).toMatchObject({ merchant: 'Salary', amount: 3200000, type: 'income' });
    expect(f[1]).toMatchObject({ merchant: 'NOMIN SUPERMARKET', amount: 48600, type: 'spend', balance: 3451400 });
  });
  it('removes duplicates across statements', () => {
    const a = parseRows([['Date', 'Description', 'Debit', 'Credit', 'Balance'], ['2026-11-02', 'X', '100', '0', '900']], 'B');
    expect(dedupe([...a, ...a])).toHaveLength(1);
  });
});
