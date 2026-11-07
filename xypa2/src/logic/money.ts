export type CurrencyCode = 'MNT' | 'USD' | 'EUR' | 'CNY' | 'KRW';
/** Display only: amounts are not converted, the symbol is just what the person's numbers are written in. */
export const CURRENCIES: Record<CurrencyCode, { name: string; symbol: string; before: boolean }> = {
  MNT: { name: 'Tögrög', symbol: '₮', before: false },
  USD: { name: 'US dollar', symbol: '$', before: true },
  EUR: { name: 'Euro', symbol: '€', before: true },
  CNY: { name: 'Yuan', symbol: '¥', before: true },
  KRW: { name: 'Won', symbol: '₩', before: true },
};
let active: CurrencyCode = 'MNT';
export const setCurrency = (c: CurrencyCode) => { active = c; };
const withSymbol = (digits: string) => { const c = CURRENCIES[active]; return c.before ? `${c.symbol}${digits}` : `${digits}${c.symbol}`; };

/** Formats whole amounts: `1,200,000₮`, negatives with a real minus: `−36,200₮`. */
export function formatMoney(value: number, opts: { hidden?: boolean } = {}): string {
  if (opts.hidden) return withSymbol('••••');
  const rounded = Math.round(value);
  const abs = Math.abs(rounded);
  const digits = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${rounded < 0 ? '−' : ''}${withSymbol(digits)}`;
}

/** Parses what a person typed in an amount field ("1,200,000", "36 200") to a whole number. */
export function parseMoney(text: string): number {
  const cleaned = text.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export const roundDown100 = (n: number) => Math.floor(n / 100) * 100;
export const roundNearest100 = (n: number) => Math.round(n / 100) * 100;
