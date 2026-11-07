import { Onest_300Light, Onest_400Regular, Onest_500Medium, useFonts } from '@expo-google-fonts/onest';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useMemo, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { HideAmountsContext } from './src/design/Amounts';
import { TabBar, TabId } from './src/design/TabBar';
import { Toast } from './src/design/Toast';
import { colors } from './src/design/tokens';
import { hidesTabBar, Nav, NavContext, Route, Sheet } from './src/nav';
import { AccountDetail, AccountsScreen } from './src/screens/accounts/AccountsScreen';
import { AssignScreen } from './src/screens/assign/AssignScreen';
import { EditHomeScreen } from './src/screens/home/EditHomeScreen';
import { NewMonthScreen } from './src/screens/month/NewMonthScreen';
import { EnvelopeDetail } from './src/screens/envelope/EnvelopeDetail';
import { GoalDetail, GoalsScreen } from './src/screens/goals/GoalsScreen';
import { Onboarding } from './src/screens/onboarding/Onboarding';
import { SettingsScreen } from './src/screens/settings/SettingsScreen';
import { PlanScreen } from './src/screens/plan/PlanScreen';
import { ReflectScreen } from './src/screens/reflect/ReflectScreen';
import { ReviewScreen } from './src/screens/review/ReviewScreen';
import { AddTxnSheet } from './src/sheets/AddTxnSheet';
import { AddAccountSheet, DaySheet, FixSyncSheet } from './src/sheets/AccountSheets';
import { CoverSheet } from './src/sheets/CoverSheet';
import { AddGoalMoneySheet, ConfirmDeleteGoalSheet, NewGoalSheet } from './src/sheets/GoalSheets';
import { MonthPickerSheet, MoveInSheet, NewEnvelopeSheet, SafeExplainSheet } from './src/sheets/SmallSheets';
import { ConfirmLogOutSheet, CurrencySheet, EditNameSheet, GmailSheet, LanguageSheet } from './src/sheets/SettingsSheets';
import { TxnListScreen } from './src/screens/reflect/TxnListScreen';
import { AskScreen } from './src/screens/ask/AskScreen';
import { ImportStatementScreen } from './src/screens/import/ImportStatementScreen';
import { StoreProvider, useStore } from './src/store/store';

function Shell() {
  const st = useStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabId>('plan');
  const [stack, setStack] = useState<Route[]>([]);
  const [sheet, setSheet] = useState<Sheet | null>(null);

  // Logging out / replaying setup must not leave old routes behind (was: stuck on Settings after login).
  const inOnboarding = st.onboarded === false;
  React.useEffect(() => {
    if (inOnboarding) { setStack([]); setSheet(null); setTab('plan'); }
  }, [inOnboarding]);

  const back = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const nav: Nav = useMemo(() => ({
    push: (r) => setStack((s) => [...s, r]),
    back,
    openSheet: setSheet,
    closeSheet: () => setSheet(null),
  }), [back]);

  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet) { setSheet(null); return true; }
      if (stack.length) { back(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [sheet, stack.length, back]);

  const top = stack[stack.length - 1];
  const close = () => setSheet(null);

  const renderRoute = (r: Route) => {
    switch (r.name) {
      case 'envelope': return <EnvelopeDetail id={r.id} />;
      case 'assign': return <AssignScreen />;
      case 'review': return <ReviewScreen />;
      case 'goal': return <GoalDetail id={r.id} />;
      case 'account': return <AccountDetail id={r.id} />;
      case 'editHome': return <EditHomeScreen />;
      case 'newMonth': return <NewMonthScreen />;
      case 'settings': return <SettingsScreen />;
      case 'txnList': return <TxnListScreen title={r.title} month={r.month} envelopeId={r.envelopeId} merchant={r.merchant} />;
      case 'ask': return <AskScreen />;
      case 'importStatement': return <ImportStatementScreen />;
    }
  };

  const renderSheet = (s: Sheet) => {
    switch (s.name) {
      case 'cover': return <CoverSheet id={s.id} onClose={close} />;
      case 'addTxn': return <AddTxnSheet envelopeId={s.envelopeId} onClose={close} />;
      case 'safeExplain': return <SafeExplainSheet onClose={close} />;
      case 'monthPicker': return <MonthPickerSheet onClose={close} />;
      case 'newEnvelope': return <NewEnvelopeSheet onClose={close} />;
      case 'moveIn': return <MoveInSheet id={s.id} onClose={close} />;
      case 'newGoal': return <NewGoalSheet onClose={close} />;
      case 'addGoalMoney': return <AddGoalMoneySheet id={s.id} onClose={close} />;
      case 'addAccount': return <AddAccountSheet onClose={close} />;
      case 'day': return <DaySheet day={s.day} onClose={close} />;
      case 'fixSync': return <FixSyncSheet id={s.id} onClose={close} />;
      case 'currency': return <CurrencySheet onClose={close} />;
      case 'language': return <LanguageSheet onClose={close} />;
      case 'editName': return <EditNameSheet onClose={close} />;
      case 'gmail': return <GmailSheet onClose={close} />;
      case 'confirmLogOut': return <ConfirmLogOutSheet onClose={close} />;
      case 'confirmDeleteGoal': return <ConfirmDeleteGoalSheet id={s.id} onClose={close} onDeleted={() => { close(); back(); }} />;
    }
  };

  if (st.onboarded === false) return <Onboarding />;

  const tabs = { plan: <PlanScreen />, goals: <GoalsScreen />, reflect: <ReflectScreen />, accounts: <AccountsScreen /> };
  const showBar = !hidesTabBar(top);

  return (
    <HideAmountsContext.Provider value={st.hideAmounts}>
      <NavContext.Provider value={nav}>
        <View style={{ flex: 1, backgroundColor: colors.page }}>
          {tabs[tab]}
          {stack.map((r, i) => (
            <View key={i} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.page }}>{renderRoute(r)}</View>
          ))}
          {showBar ? <TabBar active={tab} onChange={(t) => { setStack([]); setSheet(null); setTab(t); }} onAdd={() => setSheet({ name: 'addTxn' })} /> : null}
          <Toast toast={st.toast} onDismiss={st.dismissToast} bottom={(showBar ? 96 : 24) + insets.bottom} />
          {sheet ? renderSheet(sheet) : null}
        </View>
      </NavContext.Provider>
    </HideAmountsContext.Provider>
  );
}

export default function App() {
  const [loaded] = useFonts({ Onest_300Light, Onest_400Regular, Onest_500Medium });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.page }} />;
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
