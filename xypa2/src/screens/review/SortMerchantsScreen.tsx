import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Money } from '../../design/Amounts';
import { Chip } from '../../design/Fields';
import { Block, Button } from '../../design/Primitives';
import { ScreenFrame } from '../../design/ScreenFrame';
import { colors, font } from '../../design/tokens';
import { suggestEnvelope } from '../../logic/suggest';
import { topUnsortedMerchants } from '../../logic/topMerchants';
import { useNav } from '../../nav';
import { useStore } from '../../store/store';

/** Sort by merchant: the most common unsorted merchants, one at a time. One choice files every payment from that merchant. */
export function SortMerchantsScreen() {
  const st = useStore();
  const nav = useNav();
  const queue = useMemo(() => topUnsortedMerchants(st.txns), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [all, setAll] = useState(false);
  const [sorted, setSorted] = useState(0);
  const g = queue[i];

  if (!g) {
    const more = topUnsortedMerchants(st.txns).length > 0;
    return (
      <ScreenFrame title="Sort by merchant" onBack={nav.back}
        footer={<Button full title={more ? 'Sort the next ones' : 'Done'} onPress={() => { if (more) { nav.back(); nav.push({ name: 'sortMerchants' }); } else nav.back(); }} />}>
        <Block>
          <Text style={s.big}>{sorted} {sorted === 1 ? 'payment' : 'payments'} sorted</Text>
          <Text style={s.sub}>{more ? `${st.unsorted.length} still need an envelope.` : 'Everything has an envelope.'}</Text>
        </Block>
        {more ? <Block><Button title="Go through them one by one" variant="chip" onPress={() => { nav.back(); nav.push({ name: 'review' }); }} /></Block> : null}
      </ScreenFrame>
    );
  }

  const suggested = suggestEnvelope(g.merchant, st.envelopes);
  const ranked = [...st.envelopes].sort((a, b) => (a.id === suggested ? -1 : b.id === suggested ? 1 : 0));
  const shown = all ? ranked : ranked.slice(0, 6);
  const next = () => { setAll(false); setI(i + 1); };
  const file = (envId: string) => { st.fileMerchant(g.merchant, envId); setSorted(sorted + g.count); next(); };

  return (
    <ScreenFrame title={`Merchant ${i + 1} of ${queue.length}`} onBack={nav.back}
      footer={<Button full title="Skip" variant="chip" onPress={next} />}>
      <Block>
        <Text style={s.sub}>{g.count} {g.count === 1 ? 'payment' : 'payments'} · total</Text>
        <Money value={g.total} style={s.amount} />
        <Text style={s.merchant}>{g.merchant}</Text>
      </Block>
      <Block>
        <Text style={s.eyebrow}>Which envelope? This files all {g.count} and remembers it.</Text>
        <View style={s.wrap}>
          {shown.map((e) => <Chip key={e.id} label={e.name} color={e.color} selected={e.id === suggested} accent onPress={() => file(e.id)} />)}
          {!all && st.envelopes.length > 6 ? <Chip label="All envelopes" onPress={() => setAll(true)} /> : null}
        </View>
      </Block>
    </ScreenFrame>
  );
}

const s = StyleSheet.create({
  big: { fontFamily: font.medium, fontSize: 24, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 14, color: colors.muted, marginTop: 4 },
  amount: { fontFamily: font.regular, fontSize: 36, letterSpacing: -1.4, color: colors.ink, marginTop: 4 },
  merchant: { fontFamily: font.medium, fontSize: 18, color: colors.ink, marginTop: 6 },
  eyebrow: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginBottom: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
