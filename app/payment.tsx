import React, { useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { File } from 'expo-file-system';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { imageUri, keepImage } from '../src/data/backup';
import { colors } from '../src/theme';
import { router, useLocalSearchParams } from 'expo-router';
import { changeRegister, newId, useRegister } from '../src/data/store';
import { currentProfile, lastCompletedMonth, money, monthLabel, parseMoney, type Payment } from '../src/domain/model';
import { paymentDefault, previewPayment } from '../src/domain/billing';
import { Button, Choice, ErrorText, Field, Label, Row, Screen, useWords } from '../src/components/ui';
export default function PaymentScreen() {
  const state = useRegister(); const t = useWords(); const { id, month = lastCompletedMonth(), images: receivedImages } = useLocalSearchParams<{ id: string; month: string; images?: string }>();
  const [amount, setAmount] = useState(String(paymentDefault(state, id) / 100)); const [target, setTarget] = useState<string>();
  const [choose, setChoose] = useState(false); const [method, setMethod] = useState<'cash' | 'upi'>(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const saving = useRef(false); const household = state.households.find(h => h.id === id);
  const [details, setDetails] = useState(!!receivedImages); const [collectedOn, setCollectedOn] = useState<string>(); const [calendar, setCalendar] = useState(false);
  const [images, setImages] = useState<string[]>(() => { try { const names: unknown = JSON.parse(receivedImages ?? '[]'); return Array.isArray(names) ? names.filter((n): n is string => typeof n === 'string' && /^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/.test(n)) : []; } catch { return []; } });
  function setDay(date: Date) { setCollectedOn(date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')); }
  if (!household) return <Screen title={t('Household not found', 'വീട് കണ്ടെത്തിയില്ല')} back><Label>{t('Return to your register.', 'രജിസ്റ്ററിലേക്ക് മടങ്ങുക.')}</Label></Screen>;
  let value = 0; try { value = parseMoney(amount); } catch { /* Validate on save; keep typing uninterrupted. */ }
  const draft: Payment = { id: 'preview', customerId: id, amount: value, targetMonth: target,
    creditAfter: state.bills.filter(b => b.customerId === id).reduce((latest, b) => b.month > latest ? b.month : latest, month),
    method, images, collectedOn, enteredAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const preview = previewPayment(state, draft);
  async function save() {
    if (saving.current || !household) return; saving.current = true; setBusy(true); setError('');
    try { const parsed = parseMoney(amount); if (parsed <= 0) throw new Error(t('Enter an amount above zero.', 'പൂജ്യത്തേക്കാൾ വലിയ തുക നൽകുക.'));
      await changeRegister(d => { d.payments.push({ ...draft, id: newId(), amount: parsed }); }, { action: 'Recorded payment', customerId: id, name: currentProfile(household).name, amount: parsed });
      router.replace({ pathname: '/balance', params: { id } });
    } catch (e) { setError((e as Error).message); } finally { saving.current = false; setBusy(false); }
  }
  return <Screen title={t('Record payment', 'പണം രേഖപ്പെടുത്തുക')} back footer={<Button title={t('Save payment', 'പണമടവ് സൂക്ഷിക്കുക')} onPress={save} busy={busy} disabled={!value} />}>
    <Label variant="title" bold>{currentProfile(household).name}</Label>
    <Field label={t('Amount (₹)', 'തുക (₹)')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={{ fontSize: 32, fontWeight: '700', backgroundColor: colors.selected, borderRadius: 8, padding: 16 }} />
    <Label>{preview.allocations.preview.map(a => monthLabel(a.month, state.language) + ' ' + money(a.amount)).join(' · ') || t('Enter the amount to see allocation', 'തുക നൽകിയാൽ വിനിയോഗം കാണാം')}</Label>
    {preview.credits.preview > 0 && <Label>{t('Customer credit', 'മുൻകൂർ തുക')}: {money(preview.credits.preview)}</Label>}
    <Row title={t('Change allocation', 'വിനിയോഗം മാറ്റുക')} onPress={() => setChoose(true)} />
    <Row title={t('Optional details', 'ഐച്ഛിക വിവരങ്ങൾ')} detail={t('Collection date, method and image', 'ലഭിച്ച തീയതി, രീതി, ചിത്രം')} onPress={() => setDetails(!details)} />
    {details && <><Row title={t('Cash (optional)', 'പണം (ഐച്ഛികം)')} right={method === 'cash' ? '✓' : ''} onPress={() => setMethod(method === 'cash' ? undefined : 'cash')} />
    <Row title={t('UPI (optional)', 'UPI (ഐച്ഛികം)')} right={method === 'upi' ? '✓' : ''} onPress={() => setMethod(method === 'upi' ? undefined : 'upi')} />
    <Row title={t('Collected on', 'ലഭിച്ച തീയതി')} detail={collectedOn ?? t('Not specified', 'നൽകിയിട്ടില്ല')} onPress={() => setCalendar(true)} />
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Button secondary title={t('Today', 'ഇന്ന്')} onPress={() => setDay(new Date())} />
      <Button secondary title={t('Yesterday', 'ഇന്നലെ')} onPress={() => { const d = new Date(); d.setDate(d.getDate() - 1); setDay(d); }} />
      <Button secondary title={t('Calendar', 'കലണ്ടർ')} onPress={() => setCalendar(true)} />
      {collectedOn && <Button secondary title={t('Clear date', 'തീയതി നീക്കുക')} onPress={() => setCollectedOn(undefined)} />}
    </View>
    <Button secondary title={t('Attach image', 'ചിത്രം ചേർക്കുക')} onPress={async () => { try { const picked = await File.pickFileAsync({ mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] }); if (!picked.canceled) { const name = await keepImage(picked.result.uri); setImages(list => [...list, name]); } } catch (e) { setError((e as Error).message); } }} />
    {images.map(name => <View key={name}><Image source={{ uri: imageUri(name) }} style={{ width: '100%', height: 180, resizeMode: 'contain' }} /><Button secondary title={t('Remove image', 'ചിത്രം നീക്കുക')} onPress={() => setImages(list => list.filter(n => n !== name))} /></View>)}</>}
    {calendar && <DateTimePicker value={collectedOn ? new Date(collectedOn + 'T12:00:00') : new Date()} mode="date" maximumDate={new Date()} onChange={(event, date) => { setCalendar(false); if (event.type === 'set' && date) setDay(date); }} />}
    <ErrorText message={error} />
    {choose && <Choice title={t('Apply payment to', 'പണമടവ് വിനിയോഗിക്കുക')} options={[{ value: '', label: t('Oldest dues first', 'പഴയ കുടിശ്ശിക ആദ്യം') }, ...state.bills.filter(b => b.customerId === id).map(b => ({ value: b.month, label: monthLabel(b.month, state.language) }))]} onChoose={v => setTarget(v || undefined)} onDismiss={() => setChoose(false)} />}
  </Screen>;
}
