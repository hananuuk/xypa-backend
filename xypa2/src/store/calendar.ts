import { getLang, tr } from '../i18n';

export type Today = { month: string; day: number; monthDays: number; weekday: number; iso: string };

/** Current date facts used by safe-to-spend. weekday: 0 = Monday … 6 = Sunday. */
export function getToday(now: Date = new Date()): Today {
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    month: `${y}-${pad(m + 1)}`,
    day: now.getDate(),
    monthDays: new Date(y, m + 1, 0).getDate(),
    weekday: (now.getDay() + 6) % 7,
    iso: `${y}-${pad(m + 1)}-${pad(now.getDate())}`,
  };
}

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** Short month for tight spots: "Nov", or "11-р сар". */
export const monthShort = (month: string) => { const i = parseInt(month.slice(5, 7), 10) - 1; return getLang() === 'mn' ? `${i + 1}-р сар` : MONTH_NAMES[i].slice(0, 3); };
export const monthName = (month: string) => tr(MONTH_NAMES[parseInt(month.slice(5, 7), 10) - 1]);
