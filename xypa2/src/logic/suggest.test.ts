import { describe, expect, it } from 'vitest';
import { suggestEnvelope } from './suggest';
import { seedEnvelopes } from '../store/seed';

describe('suggestEnvelope', () => {
  it('matches merchants to envelopes', () => {
    expect(suggestEnvelope('Nomin Supermarket', seedEnvelopes)).toBe('groceries');
    expect(suggestEnvelope('Steppe Coffee', seedEnvelopes)).toBe('coffee');
    expect(suggestEnvelope('Taxi', seedEnvelopes)).toBe('transport');
  });
  it('returns null when nothing matches', () => expect(suggestEnvelope('Khan Bank ATM fee', seedEnvelopes)).toBeNull());
});
