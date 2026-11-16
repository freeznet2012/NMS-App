import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { changeRegister, newId, useRegister } from '../src/data/store';
import { billCharge, currentProfile, lastCompletedMonth, money, monthLabel } from '../src/domain/model';
import { ledger, originalTotal, prepareMonth, remainingForBill } from '../src/domain/billing';
import { Button, Choice, ErrorText, IconButton, Label, MonthPicker, Row, Screen, useWords } from '../src/components/ui';
export default function Customer() {
  const state = useRegister(); const t = useWords(); const params = useLocalSearchParams<{ id: string; month?: string }>();
  const id = params.id; const [month, setMonth] = useState(params.month ?? lastCompletedMonth());
  const [menu, setMenu] = useState(false); const [error, setError] = useState('');
  useEffect(() => { changeRegister(d => prepareMonth(d, month, newId)).catch(e => setError(e.message)); }, [month]);
  const household = state.households.find(h => h.id === id);
  if (!household) return <Screen title={t('Household not found', 'വീട് കണ്ടെത്തിയില്ല')} back><Label>{t('Return to your register.', 'രജിസ്റ്ററിലേക്ക് മടങ്ങുക.')}</Label></Screen>;
  const profile = currentProfile(household); const bill = state.bills.find(b => b.customerId === id && b.month === month); const balance = ledger(state, id);
  const options = [{ value: 'edit', label: t('Edit household', 'വീട് തിരുത്തുക') }, { value: 'balance', label: t('Balance and payments', 'ബാക്കിയും പണമടവുകളും') },
    ...(bill ? [{ value: 'correct', label: t('Correct bill', 'ബിൽ തിരുത്തുക') }, { value: 'writeoff', label: t('Write off this month’s dues', 'ഈ മാസത്തെ കുടിശ്ശിക ഒഴിവാക്കുക') }] : [])];
  return <Screen title={profile.name} back right={<IconButton name="more-vert" label={t('Customer actions', 'ഉപഭോക്തൃ പ്രവർത്തനങ്ങൾ')} onPress={() => setMenu(true)} />}
    footer={<Button title={t('Record payment', 'പണം രേഖപ്പെടുത്തുക')} onPress={() => router.push({ pathname: '/payment', params: { id, month } })} />}>
    <MonthPicker value={month} onChange={setMonth} /><ErrorText message={error} />
    {bill ? <>{bill.lines.map((line, index) => <Row key={index} title={line.code + (line.quantity > 1 ? ' ×' + line.quantity : '')}
      detail={line.deduction ? t('Deduction ', 'കിഴിവ് ') + money(line.deduction) : undefined} right={money(line.quantity * line.rate - line.deduction)} />)}
      <Row title={monthLabel(month, state.language)} right={money(billCharge(bill))} />
      {bill.carry.map(carry => <Row key={carry.billId} title={monthLabel(state.bills.find(b => b.id === carry.billId)!.month, state.language) + ' ' + t('pending', 'കുടിശ്ശിക')} right={money(carry.amount)} />)}
      <Label variant="title" bold>{t('Total to collect', 'ആകെ ലഭിക്കാനുള്ളത്')}</Label><Label variant="amount" bold>{money(originalTotal(bill))}</Label>
      {remainingForBill(bill, balance) !== originalTotal(bill) && <Row title={t('Still to collect', 'ഇനി ലഭിക്കാനുള്ളത്')} right={money(remainingForBill(bill, balance))} />}
      <Row title={t('Balance and payments', 'ബാക്കിയും പണമടവുകളും')} onPress={() => router.push({ pathname: '/balance', params: { id } })} />
    </> : <Label>{t('No bill prepared for this month.', 'ഈ മാസത്തെ ബിൽ തയ്യാറാക്കിയിട്ടില്ല.')}</Label>}
    {menu && <Choice title={t('Customer actions', 'ഉപഭോക്തൃ പ്രവർത്തനങ്ങൾ')} options={options} onChoose={action => {
      if (action === 'edit') router.push({ pathname: '/household', params: { id } });
      else if (action === 'balance') router.push({ pathname: '/balance', params: { id } });
      else if (bill) router.push({ pathname: '/adjustment', params: { id: bill.id, mode: action } });
    }} onDismiss={() => setMenu(false)} />}
  </Screen>;
}
