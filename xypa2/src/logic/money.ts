/** Formats whole tögrög: `1,200,000₮`, negatives with a real minus: `−36,200₮`. */
export function formatMoney(value: number, opts: { hidden?: boolean } = {}): string {
  if (opts.hidden) return '••••₮';
  const rounded = Math.round(value);
  const abs = Math.abs(rounded);
  const digits = String(abs).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${rounded < 0 ? '−' : ''}${digits}₮`;
}

/** Parses what a person typed in an amount field ("1,200,000", "36 200") to a whole number. */
export function parseMoney(text: string): number {
  const cleaned = text.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

export const roundDown100 = (n: number) => Math.floor(n / 100) * 100;
export const roundNearest100 = (n: number) => Math.round(n / 100) * 100;
