import type { Envelope } from './types';

// Keyword hints per envelope id. Real categorisation (per bank/merchant) comes later; this keeps Review useful now.
const hints: Record<string, string[]> = {
  groceries: ['supermarket', 'market', 'emart', 'nomin', 'minii delguur', 'grocery', 'shop'],
  coffee: ['coffee', 'cafe', 'café', 'tom n toms', 'steppe', 'starbucks', 'tea'],
  transport: ['taxi', 'uber', 'bus', 'fuel', 'petrol', 'shell', 'parking'],
  dining: ['pizza', 'restaurant', 'hotpot', 'grill', 'bbq', 'bar', 'kfc', 'burger'],
  phone: ['mobicom', 'unitel', 'skytel', 'gmobile', 'телефон'],
  internet: ['ulusnet', 'mobinet', 'internet'],
};

/** Suggest the envelope a payment most likely belongs to, or null when nothing matches. */
export function suggestEnvelope(merchant: string, envelopes: Envelope[]): string | null {
  const m = merchant.toLowerCase();
  for (const e of envelopes) {
    const words = hints[e.id] ?? [e.name.toLowerCase()];
    if (words.some((w) => m.includes(w))) return e.id;
  }
  return null;
}
