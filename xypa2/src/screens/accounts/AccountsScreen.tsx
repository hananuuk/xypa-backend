import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Money, useAmountsHidden } from '../../design/Amounts';
import { Icon } from '../../design/Icon';
import { ScreenFrame } from '../../design/ScreenFrame';
import { Block, Button, IconButton, InnerCard, PillBar, SectionLabel } from '../../design/Primitives';
import { colors, font } from '../../design/tokens';
import { formatMoney } from '../../logic/money';
import { useStore } from '../../store/store';
import { useNav } from '../../nav';

const initials = (n: string) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function AccountsScreen() {
  const st = useStore();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const hidden = useAmountsHidden();
  const net = st.accounts.reduce((a, x) => a + x.balance, 0);
  return (
    <ScrollView style={s.fill} contentContainerStyle={[s.content, { paddingTop: insets.top + 8, paddingBottom: 130 }]} showsVerticalScrollIndicator={false}>
      <PillBar left={<Text style={s.title} accessibilityRole="header">Accounts</Text>}
        right={<>
          <IconButton label={hidden ? 'Show amounts' : 'Hide amounts'} onPress={() => st.setHideAmounts(!st.hideAmounts)}><Icon name={hidden ? 'eyeOff' : 'eye'} size={20} /></IconButton>
          <IconButton label="Settings" onPress={() => nav.push({ name: 'settings' })}><Icon name="settings" size={20} /></IconButton>
          <IconButton label="Add account" onPress={() => nav.openSheet({ name: 'addAccount' })}><Icon name="plus" size={20} /></IconButton>
        </>} />
      <Block>
        <Text style={s.label}>Net worth</Text>
        <Money value={net} style={s.hero} />
      </Block>
      <Block padding={false} style={{ padding: 6, gap: 5 }}>
        {st.accounts.map((a) => (
          <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`${a.name}, ${formatMoney(a.balance, { hidden })}${a.syncOk ? '' : ', not syncing, tap to fix'}`} onPress={() => nav.push({ name: 'account', id: a.id })}>
            <InnerCard style={s.acc}>
              <View style={s.avatar}><Text style={s.avatarText}>{initials(a.name)}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{a.name}</Text>
                {a.kind === 'Wallet' ? <Text style={s.label}>Cash</Text> : a.syncOk ? <Text style={s.label}>Synced {a.lastSync?.toLowerCase()}</Text>
                  : <Pressable accessibilityRole="button" accessibilityLabel={`Fix sync for ${a.name}`} onPress={() => nav.openSheet({ name: 'fixSync', id: a.id })} hitSlop={8}><Text style={s.fix}>Not syncing · tap to fix</Text></Pressable>}
              </View>
              <Money value={a.balance} style={s.amt} />
            </InnerCard>
          </Pressable>
        ))}
      </Block>
    </ScrollView>
  );
}

export function AccountDetail({ id }: { id: string }) {
  const st = useStore();
  const nav = useNav();
  const a = st.accounts.find((x) => x.id === id);
  if (!a) return null;
  const txns = st.txns.filter((t) => t.accountId === id).sort((x, y) => (x.date < y.date ? 1 : -1));
  return (
    <ScreenFrame title={a.name} onBack={nav.back}>
      <Block>
        <Text style={s.label}>Balance</Text>
        <Money value={a.balance} style={s.hero} />
        <Text style={s.label}>{a.lastSync ? `Last sync: ${a.lastSync}` : 'Added by hand'}</Text>
      </Block>
      <Block>
        <Text style={s.name}>Does this match your {a.name} app?</Text>
        <View style={s.btns}>
          <Button title="Yes, it matches" onPress={() => st.fixBalance(id, a.balance)} />
          <Button title="Fix balance" variant="chip" onPress={() => nav.openSheet({ name: 'fixSync', id })} />
        </View>
      </Block>
      <Block>
        <SectionLabel title="Transactions" />
        <View style={{ gap: 5 }}>
          {txns.length === 0 ? <Text style={s.label}>No transactions yet.</Text> : txns.map((t) => (
            <InnerCard key={t.id} style={s.acc}>
              <View style={{ flex: 1 }}><Text style={s.name} numberOfLines={1}>{t.merchant}</Text><Text style={s.label}>{t.date.slice(5).replace('-', '/')}</Text></View>
              <Money value={t.type === 'spend' ? -t.amount : t.amount} style={s.amt} />
            </InnerCard>
          ))}
        </View>
      </Block>
    </ScreenFrame>
  );
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 4 },
  title: { fontFamily: font.medium, fontSize: 22, color: colors.ink },
  label: { fontFamily: font.regular, fontSize: 13, color: colors.muted },
  hero: { fontFamily: font.regular, fontSize: 40, letterSpacing: -1.6, color: colors.ink, marginTop: 4 },
  acc: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: font.medium, fontSize: 14, color: colors.ink2 },
  name: { fontFamily: font.regular, fontSize: 16, color: colors.ink },
  amt: { fontFamily: font.medium, fontSize: 17, color: colors.ink },
  fix: { fontFamily: font.regular, fontSize: 13, color: colors.accent, minHeight: 28, lineHeight: 28 },
  btns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
});
