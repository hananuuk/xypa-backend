import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../design/BottomSheet';
import { Icon } from '../design/Icon';
import { Field } from '../design/Fields';
import { Button, InnerCard } from '../design/Primitives';
import { colors, font } from '../design/tokens';
import { CURRENCIES, CurrencyCode } from '../logic/money';
import { useStore } from '../store/store';

function Option({ label, note, selected, disabled, onPress }: { label: string; note?: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ selected, disabled: !!disabled }} accessibilityLabel={note ? `${label}, ${note}` : label} disabled={disabled} onPress={onPress}>
      <InnerCard style={[s.opt, disabled && { opacity: 0.5 }]}>
        <Text style={s.name}>{label}</Text>
        {note ? <Text style={s.note}>{note}</Text> : selected ? <Icon name="check" size={20} /> : null}
      </InnerCard>
    </Pressable>
  );
}

export function CurrencySheet({ onClose }: { onClose: () => void }) {
  const st = useStore();
  const cur = st.currency ?? 'MNT';
  return (
    <BottomSheet visible title="Currency" onClose={onClose}>
      <View style={{ gap: 6 }}>
        {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
          <Option key={c} label={`${CURRENCIES[c].name} ${CURRENCIES[c].symbol}`} selected={cur === c} onPress={() => { st.setCurrencyCode(c); onClose(); }} />
        ))}
      </View>
      <Text style={[s.note, { marginTop: 12 }]}>This changes the symbol on your amounts. It doesn't convert them.</Text>
    </BottomSheet>
  );
}

export function LanguageSheet({ onClose }: { onClose: () => void }) {
  const st = useStore();
  return (
    <BottomSheet visible title="Language" onClose={onClose}>
      <View style={{ gap: 6 }}>
        <Option label="English" selected={st.language !== 'mn'} onPress={() => { st.setLanguage('en'); onClose(); }} />
        <Option label="Монгол" note="Coming soon" selected={false} disabled onPress={() => {}} />
      </View>
    </BottomSheet>
  );
}

export function EditNameSheet({ onClose }: { onClose: () => void }) {
  const st = useStore();
  const [name, setName] = useState(st.profile?.name ?? '');
  return (
    <BottomSheet visible title="Your name" onClose={onClose}>
      <Field label="Name" value={name} onChangeText={setName} placeholder="What should we call you?" autoFocus />
      <Button full title="Save" style={{ marginTop: 18 }} onPress={() => { st.setProfileName(name.trim()); onClose(); }} />
    </BottomSheet>
  );
}

export function ConfirmLogOutSheet({ onClose }: { onClose: () => void }) {
  const st = useStore();
  return (
    <BottomSheet visible title="Log out?" onClose={onClose}>
      <Text style={s.body}>There's no cloud account yet, so your envelopes, payments and settings live only on this phone. Logging out erases them and takes you back to the start.</Text>
      <Button full variant="accent" title="Log out and erase" style={{ marginTop: 18 }} onPress={() => { onClose(); st.logOut(); }} />
      <Button full variant="chip" title="Keep my data" style={{ marginTop: 8 }} onPress={onClose} />
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56 },
  name: { fontFamily: font.regular, fontSize: 16, color: colors.ink },
  note: { fontFamily: font.regular, fontSize: 13, color: colors.muted, lineHeight: 19 },
  body: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.ink2 },
});
