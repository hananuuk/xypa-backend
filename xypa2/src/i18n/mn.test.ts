import { describe, it, expect } from 'vitest';
import { mn } from './mn';
describe('mn', () => {
  it('has no empty or placeholder-mismatched entries', () => {
    for (const [k, v] of Object.entries(mn)) {
      expect(v.length, k).toBeGreaterThan(0);
      const a = (k.match(/\{\d+\}/g) ?? []).sort().join();
      const b = (v.match(/\{\d+\}/g) ?? []).sort().join();
      expect(b, k).toBe(a);
    }
  });
});
