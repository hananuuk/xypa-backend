import React, { createContext, useContext } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { formatMoney } from '../logic/money';
import { tabular } from './tokens';

/** "Hide amounts" (the eye). The choice is persisted by the store; input sheets pass `always`. */
export const HideAmountsContext = createContext<boolean>(false);

export function Money({ value, style, always }: { value: number; style?: StyleProp<TextStyle>; always?: boolean }) {
  const hidden = useContext(HideAmountsContext) && !always;
  return <Text style={[tabular, style]} maxFontSizeMultiplier={1.3}>{formatMoney(value, { hidden })}</Text>;
}

export const useAmountsHidden = () => useContext(HideAmountsContext);
