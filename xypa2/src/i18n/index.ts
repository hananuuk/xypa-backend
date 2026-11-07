import { mn } from './mn';

export type Lang = 'en' | 'mn';
let lang: Lang = 'en';
export const setLang = (l: Lang) => { lang = l; };
export const getLang = () => lang;

/** The device's language, used until the person picks one. */
export const deviceLang = (): Lang => {
  try { return /^mn/i.test(Intl.DateTimeFormat().resolvedOptions().locale) ? 'mn' : 'en'; } catch { return 'en'; }
};

/**
 * Translate an English sentence. {0}, {1} … are filled with the extra arguments.
 * English is the key, so a missing translation simply shows English.
 */
export function tr(key: string, ...args: (string | number)[]): string {
  const s = lang === 'mn' ? mn[key] ?? key : key;
  return args.length ? s.replace(/\{(\d+)\}/g, (_, i) => String(args[+i] ?? '')) : s;
}
