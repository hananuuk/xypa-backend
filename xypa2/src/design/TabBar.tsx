import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, IconName } from './Icon';
import { colors, font, MIN_TARGET } from './tokens';
import { t } from '../i18n/en';

export type TabId = 'plan' | 'goals' | 'reflect' | 'accounts';

const tabs: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'plan', label: t.tabs.plan, icon: 'envelope' },
  { id: 'goals', label: t.tabs.goals, icon: 'target' },
  { id: 'reflect', label: t.tabs.reflect, icon: 'pie' },
  { id: 'accounts', label: t.tabs.accounts, icon: 'bank' },
];

/** Floating black tab bar: Plan · Goals · (+) · Reflect · Accounts. Active tab is a white pill. */
export function TabBar({ active, onChange, onAdd }: { active: TabId; onChange: (t: TabId) => void; onAdd: () => void }) {
  const insets = useSafeAreaInsets();
  const item = (tab: (typeof tabs)[number]) => {
    const on = tab.id === active;
    return (
      <Pressable key={tab.id} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tab.label}
        onPress={() => onChange(tab.id)} style={[s.item, on && s.itemOn]}>
        <Icon name={tab.icon} size={22} color={on ? colors.ink : colors.white} />
        <Text style={[s.label, { color: on ? colors.ink : colors.white }]}>{tab.label}</Text>
      </Pressable>
    );
  };
  return (
    <View pointerEvents="box-none" style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={s.bar} accessibilityRole="tablist">
        {item(tabs[0])}
        {item(tabs[1])}
        <Pressable accessibilityRole="button" accessibilityLabel={t.tabs.add} onPress={onAdd} style={s.plus}>
          <Icon name="plus" size={26} color={colors.white} />
        </Pressable>
        {item(tabs[2])}
        {item(tabs[3])}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  bar: { backgroundColor: colors.ink, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingVertical: 6, minHeight: 72 },
  item: { alignItems: 'center', justifyContent: 'center', minWidth: MIN_TARGET + 18, height: 60, paddingHorizontal: 12, borderRadius: 999, gap: 3 },
  itemOn: { backgroundColor: colors.white },
  label: { fontFamily: font.regular, fontSize: 11 },
  plus: { width: 60, height: 60, borderRadius: 30, borderWidth: 1.5, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
