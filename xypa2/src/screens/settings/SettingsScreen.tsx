import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../design/Icon';
import { ScreenFrame } from '../../design/ScreenFrame';
import { Block, InnerCard } from '../../design/Primitives';
import { colors, font } from '../../design/tokens';
import { CURRENCIES } from '../../logic/money';
import { authenticate } from '../../api/client';
import { useStore } from '../../store/store';
import { useNav } from '../../nav';

function Row({ label, value, onPress, danger }: { label: string; value?: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={value ? `${label}, ${value}` : label} onPress={onPress}>
      <InnerCard style={s.row}>
        <Text style={[s.label, danger && { color: colors.accent }]}>{label}</Text>
        <View style={s.right}>{value ? <Text style={s.value} numberOfLines={1}>{value}</Text> : null}{danger ? null : <Icon name="chevronRight" size={18} color={colors.muted} />}</View>
      </InnerCard>
    </Pressable>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} onPress={() => onChange(!value)}>
      <InnerCard style={s.row}>
        <Text style={s.label}>{label}</Text>
        <View style={[s.track, { backgroundColor: value ? colors.ink : '#8F8B83' }]}><View style={[s.knob, { alignSelf: value ? 'flex-end' : 'flex-start' }]} /></View>
      </InnerCard>
    </Pressable>
  );
}

const Title = ({ t }: { t: string }) => <Text style={s.section}>{t}</Text>;

export function SettingsScreen() {
  const st = useStore();
  const nav = useNav();
  const n = { overspend: true, newTxns: true, morning: false, ...st.notify };
  const cur = CURRENCIES[st.currency ?? 'MNT'];
  const name = st.profile?.name?.trim();
  const [msg, setMsg] = React.useState<string | null>(null);
  const connect = async () => {
    setMsg(null);
    const r = await authenticate(st.profile?.email ? 'gmail' : 'signin');
    if (r.ok) st.setSession(r.me); else if (r.reason !== 'cancelled') setMsg(r.reason === 'wrong_account' ? 'Please pick the same Google account you signed in with.' : "That didn't work. Try again.");
  };
  return (
    <ScreenFrame title="Settings" onBack={nav.back}>
      <Block padding={false} style={s.block}>
        <Title t="PROFILE" />
        <Row label="Name" value={name || 'Add your name'} onPress={() => nav.openSheet({ name: 'editName' })} />
        <InnerCard style={s.row}><Text style={s.label}>Email</Text><Text style={s.value} numberOfLines={1}>{st.profile?.email ?? 'Not signed in'}</Text></InnerCard>
      </Block>
      <Block padding={false} style={s.block}>
        <Title t="CONNECTIONS" />
        {st.profile?.gmail ? (
          <Row label="Gmail" value="Connected" onPress={() => nav.openSheet({ name: 'gmail' })} />
        ) : (
          <Row label="Gmail" value={st.profile?.email ? 'Connect' : 'Sign in with Google'} onPress={connect} />
        )}
        {msg ? <Text style={s.hint} accessibilityLiveRegion="polite">{msg}</Text> : null}
        <Row label="Add a bank statement" onPress={() => nav.push({ name: 'importStatement' })} />
        <InnerCard style={s.row}><Text style={s.label}>Merchant rules</Text><Text style={s.value}>{st.rules.length} {st.rules.length === 1 ? 'rule' : 'rules'}</Text></InnerCard>
      </Block>
      <Block padding={false} style={s.block}>
        <Title t="BUDGET" />
        <Row label="Currency" value={`${cur.name} ${cur.symbol}`} onPress={() => nav.openSheet({ name: 'currency' })} />
        <Row label="Language" value={st.language === 'mn' ? 'Монгол' : 'English'} onPress={() => nav.openSheet({ name: 'language' })} />
        <InnerCard style={s.row}><Text style={s.label}>Safe to spend uses</Text><Text style={s.value}>Everyday</Text></InnerCard>
      </Block>
      <Block padding={false} style={s.block}>
        <Title t="NOTIFICATIONS" />
        <Toggle label="When I overspend" value={n.overspend} onChange={(v) => st.setNotify('overspend', v)} />
        <Toggle label="New transactions to sort" value={n.newTxns} onChange={(v) => st.setNotify('newTxns', v)} />
        <Toggle label="Morning safe-to-spend" value={n.morning} onChange={(v) => st.setNotify('morning', v)} />
        <Text style={s.hint}>Your choices are saved. Alerts themselves start working once notifications are switched on.</Text>
      </Block>
      <Block padding={false} style={s.block}>
        <Title t="SETUP" />
        <Row label="Replay first-run setup" onPress={st.startOnboarding} />
        <Row label="Preview a new month" onPress={() => nav.push({ name: 'newMonth' })} />
      </Block>
      <Block padding={false} style={s.block}>
        <Row label="Log out" danger onPress={() => nav.openSheet({ name: 'confirmLogOut' })} />
      </Block>
    </ScreenFrame>
  );
}

const s = StyleSheet.create({
  block: { padding: 6, gap: 5 },
  section: { fontFamily: font.regular, fontSize: 12, letterSpacing: 0.6, color: colors.muted, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, gap: 12 },
  label: { fontFamily: font.regular, fontSize: 16, color: colors.ink },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  value: { fontFamily: font.regular, fontSize: 15, color: colors.muted, flexShrink: 1 },
  track: { width: 52, height: 30, borderRadius: 15, padding: 3, justifyContent: 'center' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.white },
  hint: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.muted, paddingHorizontal: 12, paddingBottom: 10 },
});
