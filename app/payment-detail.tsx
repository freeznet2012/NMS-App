import React, { useState } from 'react';
import { Alert, Image, View } from 'react-native';
import { Directory, File } from 'expo-file-system';
import { router, useLocalSearchParams } from 'expo-router';
import { changeRegister, useRegister } from '../src/data/store';
import { imageUri } from '../src/data/backup';
import { currentProfile, money, monthLabel } from '../src/domain/model';
import { ledger } from '../src/domain/billing';
import { Button, Label, Row, Screen, showError, useWords } from '../src/components/ui';
export default function PaymentDetail() {
  const state = useRegister(); const t = useWords(); const { id } = useLocalSearchParams<{ id: string }>(); const [busy, setBusy] = useState(false);
  const payment = state.payments.find(p => p.id === id);
  if (!payment) return <Screen title={t('Payment removed', 'പണമടവ് നീക്കി')} back><Label>{t('The customer balance has been updated.', 'ഉപഭോക്താവിന്റെ ബാക്കി പുതുക്കി.')}</Label></Screen>;
  const household = state.households.find(h => h.id === payment.customerId)!; const balances = ledger(state, household.id);
  return <Screen title={currentProfile(household).name} back>
    <Label variant="amount" bold>{money(payment.amount)}</Label>
    <Row title={t('Entered', 'രേഖപ്പെടുത്തിയത്')} detail={new Date(payment.enteredAt).toLocaleString()} />
    <Row title={t('Updated', 'പുതുക്കിയത്')} detail={new Date(payment.updatedAt).toLocaleString()} />
    <Row title={t('Collected on', 'ലഭിച്ച തീയതി')} detail={payment.collectedOn ?? t('Not specified', 'നൽകിയിട്ടില്ല')} />
    <Row title={t('Method', 'രീതി')} detail={payment.method?.toUpperCase() ?? t('Not specified', 'നൽകിയിട്ടില്ല')} />
    {balances.allocations[id].map(a => <Row key={a.billId} title={monthLabel(a.month, state.language)} right={money(a.amount)} />)}
    {payment.images.map(name => <View key={name}><Image source={{ uri: imageUri(name) }} style={{ width: '100%', height: 240, resizeMode: 'contain' }} />
      <Button secondary title={t('Save image', 'ചിത്രം സൂക്ഷിക്കുക')} onPress={async () => { try { const folder = await Directory.pickDirectoryAsync(); const destination = folder.createFile(name, name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg'); new File(imageUri(name)).copy(destination); } catch (e) { showError(e); } }} /></View>)}
    <Button danger title={t('Delete payment', 'പണമടവ് നീക്കുക')} busy={busy} onPress={() => Alert.alert(t('Delete this payment?', 'ഈ പണമടവ് നീക്കണോ?'),
      t('Its amount will be owed again. Save any image you need before deleting.', 'ഈ തുക വീണ്ടും കുടിശ്ശികയാകും. ആവശ്യമായ ചിത്രം ആദ്യം സൂക്ഷിക്കുക.'), [{ text: t('Cancel', 'റദ്ദാക്കുക'), style: 'cancel' }, { text: t('Delete', 'നീക്കുക'), style: 'destructive', onPress: async () => {
        if (busy) return; setBusy(true); try { await changeRegister(d => { d.payments = d.payments.filter(p => p.id !== id); }, { action: 'Deleted payment', customerId: household.id, name: currentProfile(household).name, amount: payment.amount }); router.back(); } catch (e) { showError(e); } finally { setBusy(false); }
      } }])} />
  </Screen>;
}
