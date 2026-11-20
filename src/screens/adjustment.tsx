import React, { useState } from 'react';
import { Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, ErrorText, Field, Label, Row, Screen, useWords } from '../components/ui';
import { changeRegister, newId, useRegister } from '../data/store';
import { ledger } from '../domain/billing';
import { previewBillCorrection, recordBillCorrection, type BillItems } from '../domain/bill-corrections';
import { billLineCharge, maxStoredAmount, money, monthLabel, parseMoney, rateAt, withCopyCount, type Bill } from '../domain/model';

function openAdjustment(bill: Bill, mode: string, item?: string) {
  router.push({ pathname: '/adjustment', params: { id: bill.id, mode, ...(item === undefined ? {} : { item }) } });
}

export default function AdjustmentScreen() {
  const state = useRegister();
  const t = useWords();
  const { id, mode = 'correct', item } = useLocalSearchParams<{ id: string; mode?: string; item?: string }>();
  const bill = state.bills.find(entry => entry.id === id);
  if (!bill) {
    return <Screen title={t('Bill not found', 'ബിൽ കണ്ടെത്തിയില്ല')} back>
      <Label>{t('Return to the customer.', 'ഉപഭോക്താവിലേക്ക് മടങ്ങുക.')}</Label>
    </Screen>;
  }
  if (mode === 'writeoff') return <WriteOff bill={bill} />;
  if (bill.opening !== undefined || ['edit-paper', 'edit-custom', 'add-paper', 'add-custom'].includes(mode)) {
    return <ItemEditor key={bill.id + ':' + mode + ':' + item} bill={bill} mode={mode} item={item} />;
  }
  const adding = mode === 'add';
  const papers = state.periodicals.filter(paper => !paper.inactive && !bill.lines.some(line => line.periodicalId === paper.id));
  return <Screen canvas title={adding ? t('Add item', 'ഇനം ചേർക്കുക') : t('Correct bill', 'ബിൽ തിരുത്തുക')} back>
    <Label bold>{bill.name} · {monthLabel(bill.month, state.language)}</Label>
    <Label>{t('Changes apply to this bill only.', 'മാറ്റങ്ങൾ ഈ ബില്ലിൽ മാത്രം ബാധകമാണ്.')}</Label>
    {adding ? <>
      <Button secondary icon="add" title={t('Add custom item', 'സ്വന്തം ഇനം ചേർക്കുക')} onPress={() => openAdjustment(bill, 'add-custom')} />
      <Label variant="headline" bold>{t('Choose a periodical', 'ഒരു പത്രം തിരഞ്ഞെടുക്കുക')}</Label>
      {papers.length === 0 && <Label>{t('No other active periodicals to add.', 'ചേർക്കാൻ മറ്റു സജീവ പത്രങ്ങളില്ല.')}</Label>}
      {papers.map(paper => {
        const rate = rateAt(paper, bill.month);
        return <Row key={paper.id} title={paper.name + ' (' + paper.code + ')'}
          right={rate && money(rate.amount)} onPress={() => openAdjustment(bill, 'add-paper', paper.id)} />;
      })}
    </> : <>
      {bill.lines.map((line, index) => <Row key={index} title={withCopyCount(
        state.periodicals.find(paper => paper.id === line.periodicalId)?.name ?? line.code, line.quantity)}
        right={money(billLineCharge(line))} onPress={() => openAdjustment(bill, 'edit-paper', String(index))} />)}
      {bill.customItems?.map(entry => <Row key={entry.id} title={entry.name} right={money(entry.amount)}
        onPress={() => openAdjustment(bill, 'edit-custom', entry.id)} />)}
      <Button secondary icon="add" title={t('Add item', 'ഇനം ചേർക്കുക')} onPress={() => openAdjustment(bill, 'add')} />
    </>}
  </Screen>;
}

function ItemEditor({ bill, mode, item }: { bill: Bill; mode: string; item?: string }) {
  const state = useRegister();
  const t = useWords();
  const [initialBill] = useState(bill);
  const [customId] = useState(newId);
  const opening = bill.opening !== undefined;
  const custom = mode === 'add-custom' || mode === 'edit-custom';
  const adding = mode === 'add-custom' || mode === 'add-paper';
  const paperIndex = mode === 'edit-paper' && item !== undefined ? Number(item) : -1;
  const line = initialBill.lines[paperIndex];
  const customItem = initialBill.customItems?.find(entry => entry.id === item);
  const paper = state.periodicals.find(entry => entry.id === (line?.periodicalId ?? item));
  const usualRate = mode === 'add-paper' && paper ? rateAt(paper, initialBill.month) : undefined;
  const [label, setLabel] = useState(customItem?.name ?? '');
  const [amount, setAmount] = useState(opening ? String(initialBill.opening! / 100) : customItem ? String(customItem.amount / 100) : '');
  const [quantity, setQuantity] = useState(String(line?.quantity ?? 1));
  const [rate, setRate] = useState(line ? String(line.rate / 100) : usualRate ? String(usualRate.amount / 100) : '');
  const [deduction, setDeduction] = useState(String((line?.deduction ?? 0) / 100));
  const [days, setDays] = useState(line?.missedDays === undefined ? '' : String(line.missedDays));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const title = opening ? t('Correct opening balance', 'മുൻ കുടിശ്ശിക തിരുത്തുക') :
    adding ? t('Add bill item', 'ബിൽ ഇനം ചേർക്കുക') : t('Edit bill item', 'ബിൽ ഇനം തിരുത്തുക');
  if (!opening && !(custom ? adding || customItem : paper && (adding || line))) {
    return <Screen title={title} back><Label>{t('Bill item not found.', 'ബിൽ ഇനം കണ്ടെത്തിയില്ല.')}</Label></Screen>;
  }

  function readItems(remove: boolean): BillItems {
    const items: BillItems = { lines: initialBill.lines };
    if (opening) return { ...items, opening: parseMoney(amount) };
    if (custom) {
      const otherItems = initialBill.customItems ?? [];
      if (remove) return { ...items, customItems: otherItems.filter(entry => entry.id !== item) };
      const name = label.trim();
      if (!name) throw new Error(t('Enter a name for this item.', 'ഇനത്തിന്റെ പേര് നൽകുക.'));
      const replacement = { ...customItem, id: customItem?.id ?? customId, name, amount: parseMoney(amount) };
      return { ...items, customItems: adding ? [...otherItems, replacement] :
        otherItems.map(entry => entry.id === item ? replacement : entry) };
    }
    if (remove) return { ...items, lines: initialBill.lines.filter((_, index) => index !== paperIndex) };
    const copies = Number(quantity);
    const price = parseMoney(rate);
    const discount = deduction.trim() ? parseMoney(deduction) : 0;
    const missedDays = days.trim() ? Number(days) : undefined;
    if (!/^\d+$/.test(quantity.trim()) || copies < 1 || copies > Math.max(100, line?.quantity ?? 0)) {
      throw new Error(t('Enter a valid number of copies.', 'കോപ്പികളുടെ എണ്ണം ശരിയായി നൽകുക.'));
    }
    if (price > maxStoredAmount || discount > maxStoredAmount || discount > price * copies ||
      (missedDays !== undefined && (!/^\d+$/.test(days.trim()) || missedDays > 31))) {
      throw new Error(t('Check the price, deduction and missed days.', 'വിലയും കിഴിവും ലഭിക്കാത്ത ദിവസങ്ങളും പരിശോധിക്കുക.'));
    }
    const replacement = { periodicalId: paper!.id, code: line?.code ?? paper!.code,
      quantity: copies, rate: price, deduction: discount, missedDays };
    return { ...items, lines: adding ? [...initialBill.lines, replacement] :
      initialBill.lines.map((entry, index) => index === paperIndex ? replacement : entry) };
  }

  async function save(items: BillItems, itemName: string | undefined, expectedUpdatedAt: string) {
    if (busy) return;
    setBusy(true);
    try {
      await changeRegister(draft => {
        if (draft.updatedAt !== expectedUpdatedAt) {
          throw new Error(t('The register changed. Review the new totals and try again.', 'രജിസ്റ്ററിൽ മാറ്റമുണ്ട്. പുതിയ തുക പരിശോധിച്ച് വീണ്ടും ശ്രമിക്കുക.'));
        }
        recordBillCorrection(draft, initialBill, items, { id: newId(), at: new Date().toISOString(), item: itemName });
      });
      if (adding && router.canDismiss()) router.dismiss(2);
      else if (router.canGoBack()) router.back();
      else router.replace({ pathname: '/customer', params: { id: bill.customerId, month: bill.month } });
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function review(remove = false) {
    setError('');
    try {
      if (JSON.stringify(bill) !== JSON.stringify(initialBill)) {
        throw new Error(t('This bill changed. Reopen it before editing.', 'ഈ ബിൽ മാറി. തിരുത്താൻ വീണ്ടും തുറക്കുക.'));
      }
      const items = readItems(remove);
      const preview = previewBillCorrection(state, bill, items);
      const change = (before: number, after: number) => money(before) + ' → ' + money(after);
      const details = [
        t('Bill total', 'ബിൽ തുക') + '  ' + change(preview.before.original, preview.after.original),
        t('Still to collect', 'ഇനി ലഭിക്കാനുള്ളത്') + '  ' + change(preview.before.remaining, preview.after.remaining),
      ];
      if (preview.creditBefore !== preview.creditAfter) {
        details.push(t('Customer credit', 'മുൻകൂർ തുക') + '  ' + change(preview.creditBefore, preview.creditAfter));
      }
      if (preview.otherMonthsChanged) {
        details.push(t('The amount still to collect on another bill will also change.',
          'മറ്റൊരു ബില്ലിൽ ഇനി ലഭിക്കാനുള്ള തുകയും മാറും.'));
      }
      const itemName = custom ? (remove ? customItem?.name : label.trim()) : line?.code ?? paper?.code;
      Alert.alert(remove ? t('Remove from this bill?', 'ഈ ബില്ലിൽ നിന്ന് നീക്കണോ?') : t('Review bill change', 'ബിൽ മാറ്റം പരിശോധിക്കുക'),
        details.join('\n\n'), [
          { text: t('Cancel', 'റദ്ദാക്കുക'), style: 'cancel' },
          { text: remove ? t('Remove item', 'ഇനം നീക്കുക') : t('Save', 'സൂക്ഷിക്കുക'), style: remove ? 'destructive' : 'default',
            onPress: () => void save(items, itemName, state.updatedAt) },
        ]);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  return <Screen canvas title={title} back footer={<Button title={t('Review changes', 'മാറ്റങ്ങൾ പരിശോധിക്കുക')} busy={busy} onPress={() => review()} />}>
    <Label bold>{bill.name} · {monthLabel(bill.month, state.language)}</Label>
    <Label>{t('Changes apply to this bill only.', 'മാറ്റങ്ങൾ ഈ ബില്ലിൽ മാത്രം ബാധകമാണ്.')}</Label>
    {opening || custom ? <>
      {custom && <Field label={t('Item name', 'ഇനത്തിന്റെ പേര്')} value={label} onChangeText={setLabel} maxLength={200} />}
      <Field label={opening ? t('Opening dues (₹)', 'മുൻ കുടിശ്ശിക (₹)') : t('Amount (₹)', 'തുക (₹)')}
        value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
    </> : <>
      <Label variant="headline" bold>{paper!.name} ({line?.code ?? paper!.code})</Label>
      <Field label={t('Copies', 'കോപ്പികൾ')} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" />
      <Field label={t('Price per copy (₹)', 'ഒരു കോപ്പിയുടെ വില (₹)')} value={rate} onChangeText={setRate} keyboardType="decimal-pad" />
      <Field label={t('Final deduction (₹)', 'അവസാന കിഴിവ് (₹)')} value={deduction} onChangeText={setDeduction} keyboardType="decimal-pad" />
      <Field label={t('Days not delivered (optional)', 'ലഭിക്കാത്ത ദിവസങ്ങൾ (ഐച്ഛികം)')} value={days} onChangeText={setDays} keyboardType="number-pad" />
    </>}
    <ErrorText message={error} />
    {!adding && !opening && <Button danger title={t('Remove from this bill', 'ഈ ബില്ലിൽ നിന്ന് നീക്കുക')}
      icon="delete-outline" disabled={busy} onPress={() => review(true)} />}
  </Screen>;
}

function WriteOff({ bill }: { bill: Bill }) {
  const state = useRegister();
  const t = useWords();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await changeRegister(draft => {
        const value = parseMoney(amount);
        if (value <= 0 || value > (ledger(draft, bill.customerId).remaining[bill.id] ?? 0)) {
          throw new Error(t('Write off only an outstanding amount.', 'കുടിശ്ശികയുള്ള തുക മാത്രം ഒഴിവാക്കാം.'));
        }
        draft.writeOffs.push({ id: newId(), billId: bill.id, amount: value, reason, enteredAt: new Date().toISOString() });
      }, { action: 'Wrote off dues', customerId: bill.customerId, name: bill.name });
      router.back();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return <Screen title={t('Write off dues', 'കുടിശ്ശിക ഒഴിവാക്കുക')} back footer={<Button title={t('Save adjustment', 'മാറ്റം സൂക്ഷിക്കുക')}
    busy={busy} onPress={() => Alert.alert(t('Apply this adjustment?', 'ഈ മാറ്റം ബാധകമാക്കണോ?'),
      t('Customer balances and payment allocation will be recalculated.', 'ഉപഭോക്താവിന്റെ ബാക്കിയും പണമടവിന്റെ വിനിയോഗവും വീണ്ടും കണക്കാക്കും.'),
      [{ text: t('Cancel', 'റദ്ദാക്കുക'), style: 'cancel' }, { text: t('Save', 'സൂക്ഷിക്കുക'), onPress: () => void save() }])} />}>
    <Label bold>{bill.name} · {monthLabel(bill.month, state.language)}</Label>
    <Label>{t('Still due', 'ബാക്കി')}: {money(ledger(state, bill.customerId).remaining[bill.id] ?? 0)}</Label>
    <Field label={t('Amount to forgive (₹)', 'ഒഴിവാക്കുന്ന തുക (₹)')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
    <Field label={t('Reason (optional)', 'കാരണം (ഐച്ഛികം)')} value={reason} onChangeText={setReason} />
    <ErrorText message={error} />
  </Screen>;
}
