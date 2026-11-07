import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { tr } from '../i18n';

const swap = (c: React.ReactNode): React.ReactNode => {
  if (typeof c === 'string') return c.trim() ? c.replace(c.trim(), tr(c.trim())) : c;
  if (Array.isArray(c)) return c.map((x, i) => (typeof x === 'string' ? <React.Fragment key={i}>{swap(x)}</React.Fragment> : x));
  return c;
};

/** Text that translates plain-string children. Anything built from several pieces is translated where it is built. */
export function Text({ children, ...rest }: TextProps) {
  return <RNText {...rest}>{swap(children)}</RNText>;
}
