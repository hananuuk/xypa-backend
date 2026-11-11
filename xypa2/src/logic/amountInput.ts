/** Helpers for the typed-amount screen. */
export const MAX_DIGITS = 9;

/** "1234567" → "1,234,567" */
export const groupDigits = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Append a key press to the typed digits: no leading zeros, capped length. */
export function pressKey(digits: string, key: string): string {
  if (key === 'back') return digits.slice(0, -1);
  if (!/^\d$/.test(key)) return digits;
  if (digits === '' && key === '0') return digits;
  return digits.length >= MAX_DIGITS ? digits : digits + key;
}

/** 2,500,000 → { million: 2, thousand: 500, rest: 0 } */
export function spokenParts(value: number): { million: number; thousand: number; rest: number } {
  return { million: Math.floor(value / 1_000_000), thousand: Math.floor((value % 1_000_000) / 1_000), rest: value % 1_000 };
}

/** Turn the chosen spending categories into "usual" envelopes, splitting the monthly amount evenly (rounded down to 1,000). */
export function usualFromCategories(cats: string[], monthly: number): { id: string; name: string; monthly: number; on: boolean }[] {
  const each = cats.length ? Math.floor(monthly / cats.length / 1000) * 1000 : 0;
  return cats.map((name, i) => ({ id: `cat-${i}-${name.toLowerCase().replace(/\W+/g, '-')}`, name, monthly: each, on: true }));
}

/** Spending categories offered in onboarding. Names match what the scan detects. */
export const CATEGORY_CHOICES = ['Groceries', 'Dining Out', 'Coffee', 'Transport', 'Taxi', 'Shopping', 'Clothes', 'Health', 'Fitness', 'Entertainment', 'Education', 'Kids', 'Pets', 'Gifts', 'Beauty', 'Fuel'];
