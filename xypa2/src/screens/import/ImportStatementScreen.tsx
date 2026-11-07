import React, { useState } from 'react';
import { tr } from '../../i18n';
import { StyleSheet } from 'react-native';
import { Text } from '../../design/Text';
import { Block, Button } from '../../design/Primitives';
import { ScreenFrame } from '../../design/ScreenFrame';
import { colors, font } from '../../design/tokens';
import type { ImportResult } from '../../logic/importStatement';
import { useNav } from '../../nav';
import { useStore } from '../../store/store';
import { StatementStep } from '../onboarding/StatementStep';

/** Add more statements any time after setup. */
export function ImportStatementScreen() {
  const st = useStore();
  const nav = useNav();
  const [done, setDone] = useState<ImportResult | null>(null);
  if (!done) return <StatementStep plain onBack={nav.back} onRead={(found) => setDone(st.importStatement(found))} />;
  const lines = [
    tr('{0} new transactions added', done.added),
    done.duplicates ? tr('{0} already in xypa, skipped', done.duplicates) : null,
    done.newAccounts.length ? tr('New accounts: {0}', done.newAccounts.join(', ')) : null,
    done.unsorted ? tr('{0} need sorting into an envelope', done.unsorted) : null,
  ].filter(Boolean) as string[];
  return (
    <ScreenFrame title="Statement added" onBack={nav.back}>
      <Block>
        {lines.map((l) => <Text key={l} style={s.line}>{l}</Text>)}
        {done.added === 0 ? <Text style={s.hint}>Everything in that statement was already here.</Text> : null}
      </Block>
      {done.unsorted ? <Block><Button title="Sort the most common merchants" onPress={() => { nav.back(); nav.push({ name: 'sortMerchants' }); }} /></Block> : null}
      {done.unsorted ? <Block><Button variant="chip" title="Go through them one by one" onPress={() => { nav.back(); nav.push({ name: 'review' }); }} /></Block> : null}
      <Block><Button title="Add another statement" variant="chip" onPress={() => setDone(null)} /></Block>
    </ScreenFrame>
  );
}

const s = StyleSheet.create({
  line: { fontFamily: font.regular, fontSize: 16, lineHeight: 26, color: colors.ink },
  hint: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 6 },
});
