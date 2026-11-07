import { describe, expect, it } from 'vitest';
import { bankFor, BANKS } from './banks';

describe('banks', () => {
  it('matches the names the app already uses', () => {
    expect(bankFor('M bank')?.id).toBe('mbank');
    expect(bankFor('Golomt ··9416')?.id).toBe('golomt');
    expect(bankFor('Хаан банк')?.id).toBe('khan');
    expect(bankFor('Cash')).toBeUndefined();
  });
  it('has unique ids', () => { expect(new Set(BANKS.map((b) => b.id)).size).toBe(BANKS.length); });
});
