import React from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRegister } from '../src/data/store';
import { ledger } from '../src/domain/billing';
import { currentProfile, money, monthLabel } from '../src/domain/model';
import { Button, Label, Row, Screen, useWords } from '../src/components/ui';
import { colors } from '../src/theme';
export default function BalanceScreen() {
  const state = useRegister(); const t = useWords(); const { id } = useLocalSearchParams<{ id: string }>();
  const household = state.households.find(h => h.id === id); const balances = ledger(state, id);
  const payments = state.payments.filter(p => p.customerId === id).slice().reverse(); const recent = payments[0];
  return <Screen title={(household ? currentProfile(household).name : '') + t('’s balance', ' — ബാക്കി')} back
    footer={recent && <Button title={t('View payment', 'പണമടവ് കാണുക')} onPress={() => router.push({ pathname: '/payment-detail', params: { id: recent.id } })} />}>
    <View style={{ backgroundColor: colors.selected, borderRadius: 8, padding: 24, alignItems: 'center', gap: 8 }}><Label variant="amount" bold>{money(Object.values(balances.remaining).reduce((a, b) => a + b, 0))}</Label><Label bold>{t('still due', 'ബാക്കി')}</Label></View>
    {state.bills.filter(b => b.customerId === id).map(b => <Row key={b.id} title={(balances.remaining[b.id] === 0 ? '✓ ' : '') + monthLabel(b.month, state.language)} right={balances.remaining[b.id] === 0 ? t('Paid', 'അടച്ചു') : money(balances.remaining[b.id])}
      onPress={() => router.push({ pathname: '/customer', params: { id, month: b.month } })} />)}
    {Object.values(balances.credits).some(v => v > 0) && <Row title={t('Customer credit', 'മുൻകൂർ തുക')} right={money(Object.values(balances.credits).reduce((a, b) => a + b, 0))} />}
    {payments.map((payment, i) => <Row key={payment.id} title={i === 0 ? t('Recent payment', 'അവസാന പണമടവ്') : t('Payment', 'പണമടവ്')} right={money(payment.amount)} detail={t('Entered ', 'രേഖപ്പെടുത്തിയത് ') + new Date(payment.enteredAt).toLocaleString()} onPress={() => router.push({ pathname: '/payment-detail', params: { id: payment.id } })} />)}
  </Screen>;
}
