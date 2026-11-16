import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { changeRegister, newId, useRegister } from '../src/data/store';
import { ledger } from '../src/domain/billing';
import { billCharge, money, monthLabel, parseMoney } from '../src/domain/model';
import { Button, ErrorText, Field, Label, Screen, useWords } from '../src/components/ui';
export default function AdjustmentScreen() {
  const state = useRegister(); const t = useWords(); const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const bill = state.bills.find(b => b.id === id);
  const [lines, setLines] = useState(() => bill?.lines.map(l => ({ rate: String(l.rate / 100), deduction: String(l.deduction / 100), days: l.missedDays === undefined ? '' : String(l.missedDays) })) ?? []);
  const [amount, setAmount] = useState(mode === 'writeoff' ? '' : String((bill?.opening ?? 0) / 100)); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (!bill) return <Screen title={t('Bill not found', 'ബിൽ കണ്ടെത്തിയില്ല')} back><Label>{t('Return to the customer.', 'ഉപഭോക്താവിലേക്ക് മടങ്ങുക.')}</Label></Screen>;
  async function save() {
    if (busy || !bill) return; setBusy(true); setError('');
    try { await changeRegister(d => {
      const saved = d.bills.find(b => b.id === id)!;
      if (mode === 'writeoff') {
        const value = parseMoney(amount); if (value <= 0 || value > ledger(d, bill.customerId).remaining[id]) throw new Error(t('Write off only an outstanding amount.', 'കുടിശ്ശികയുള്ള തുക മാത്രം ഒഴിവാക്കാം.'));
        d.writeOffs.push({ id: newId(), billId: id, amount: value, reason, enteredAt: new Date().toISOString() });
      } else {
        if (saved.opening !== undefined) saved.opening = parseMoney(amount);
        else saved.lines = saved.lines.map((line, i) => {
          const rate = parseMoney(lines[i].rate), deduction = parseMoney(lines[i].deduction);
          const days = lines[i].days.trim() ? Number(lines[i].days) : undefined;
          if (deduction > rate * line.quantity || (days !== undefined && (!Number.isInteger(days) || days < 0 || days > 31))) throw new Error(t('Check the deduction and missed days.', 'കിഴിവും ലഭിക്കാത്ത ദിവസങ്ങളും പരിശോധിക്കുക.'));
          return { ...line, rate, deduction, missedDays: days };
        });
        if (d.writeOffs.filter(w => w.billId === id).reduce((sum, w) => sum + w.amount, 0) > billCharge(saved)) throw new Error(t('This bill already has a larger write-off. Review it before reducing the charge.', 'ഈ ബില്ലിലെ ഒഴിവാക്കിയ തുക കൂടുതലാണ്. ആദ്യം പരിശോധിക്കുക.'));
      }
    }, { action: mode === 'writeoff' ? 'Wrote off dues' : 'Corrected bill', customerId: bill.customerId, name: bill.name }); router.back();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <Screen title={mode === 'writeoff' ? t('Write off dues', 'കുടിശ്ശിക ഒഴിവാക്കുക') : t('Correct bill', 'ബിൽ തിരുത്തുക')} back
    footer={<Button title={t('Save adjustment', 'മാറ്റം സൂക്ഷിക്കുക')} busy={busy} onPress={() => Alert.alert(t('Apply this adjustment?', 'ഈ മാറ്റം ബാധകമാക്കണോ?'), t('Customer balances and payment allocation will be recalculated.', 'ഉപഭോക്താവിന്റെ ബാക്കിയും പണമടവിന്റെ വിനിയോഗവും വീണ്ടും കണക്കാക്കും.'), [{ text: t('Cancel', 'റദ്ദാക്കുക'), style: 'cancel' }, { text: t('Save', 'സൂക്ഷിക്കുക'), onPress: save }])} />}>
    <Label bold>{bill.name} · {monthLabel(bill.month, state.language)}</Label>
    {mode === 'writeoff' ? <><Label>{t('Still due', 'ബാക്കി')}: {money(ledger(state, bill.customerId).remaining[id])}</Label><Field label={t('Amount to forgive (₹)', 'ഒഴിവാക്കുന്ന തുക (₹)')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /><Field label={t('Reason (optional)', 'കാരണം (ഐച്ഛികം)')} value={reason} onChangeText={setReason} /></> : bill.opening !== undefined ? <Field label={t('Opening dues (₹)', 'മുൻ കുടിശ്ശിക (₹)')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" /> : bill.lines.map((line, i) => <View key={i} style={{ gap: 12 }}>
      <Label variant="title" bold>{line.code} × {line.quantity}</Label>
      <Field label={t('Price per copy (₹)', 'ഒരു കോപ്പിയുടെ വില (₹)')} value={lines[i].rate} onChangeText={v => setLines(list => list.map((l, n) => n === i ? { ...l, rate: v } : l))} keyboardType="decimal-pad" />
      <Field label={t('Days not delivered (optional)', 'ലഭിക്കാത്ത ദിവസങ്ങൾ (ഐച്ഛികം)')} value={lines[i].days} onChangeText={v => setLines(list => list.map((l, n) => n === i ? { ...l, days: v } : l))} keyboardType="number-pad" />
      <Field label={t('Final deduction (₹)', 'അവസാന കിഴിവ് (₹)')} value={lines[i].deduction} onChangeText={v => setLines(list => list.map((l, n) => n === i ? { ...l, deduction: v } : l))} keyboardType="decimal-pad" />
    </View>)}<ErrorText message={error} />
  </Screen>;
}
