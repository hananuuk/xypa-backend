// Design tokens from the xypa 2.0 spec (§2). One accent colour; light, thin type.

export const colors = {
  page: '#E9E7E2',
  block: '#FFFFFF',
  inner: '#F3F2EF',
  chip: '#F1EFEA',
  ink: '#121212',
  ink2: '#3F3C37',
  muted: '#5E5B55',
  line: '#E6E2DA',
  line2: '#CFCBC2',
  accent: '#C2410C',
  navy: '#1B2A8A',
  accentSoft: '#FDEDE4',
  accentInk: '#9A3412',
  gaugeTrack: '#E4E1DA',
  gaugeFill: '#77716A',
  white: '#FFFFFF',
} as const;

/** Envelope dots are the only other colours. */
export const envelopeColors = {
  Dining: '#D9774A',
  Groceries: '#2E9E72',
  Transport: '#4A8CC9',
  Coffee: '#B8901A',
  Rent: '#7A6BD6',
  Phone: '#5F8A99',
  Internet: '#A0699B',
} as const;

export const palette = Object.values(envelopeColors);

export const radius = { block: 24, inner: 18, pill: 999, sheet: 28 } as const;
export const space = { gutter: 16, gap: 4, blockV: 14, blockH: 16, innerGap: 5 } as const;

/** Onest is loaded in App.tsx; weights above 500 are deliberately unused. */
export const font = {
  light: 'Onest_300Light',
  regular: 'Onest_400Regular',
  medium: 'Onest_500Medium',
  bold: 'Onest_700Bold',
} as const;

export const type = {
  hero: { fontFamily: font.regular, fontSize: 44, letterSpacing: -1.8 },
  heroSmall: { fontFamily: font.regular, fontSize: 34, letterSpacing: -1.4 },
  title: { fontFamily: font.medium, fontSize: 22 },
  envName: { fontFamily: font.regular, fontSize: 16 },
  envAmount: { fontFamily: font.medium, fontSize: 18 },
  label: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  section: { fontFamily: font.regular, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' as const, color: colors.muted },
  body: { fontFamily: font.regular, fontSize: 15, color: colors.ink },
} as const;

export const tabular = { fontVariant: ['tabular-nums' as const] };

/** Every touch target is at least this big. */
export const MIN_TARGET = 44;
