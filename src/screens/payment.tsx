import React, { useRef, useState } from 'react';
import { Image, Keyboard, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { File } from 'expo-file-system';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { PaymentSheet } from '../components/payment-sheet';
import { Button, ErrorText, Field, Icon, IconButton, Label, Screen, useWords } from '../components/ui';
import { imageUri, keepImage } from '../data/backup';
import { changeRegister, newId, useRegister } from '../data/store';
import { ledger, paymentDefault, previewPayment } from '../domain/billing';
import { currentProfile, lastCompletedMonth, maxStoredAmount, money, monthKey, monthLabel, parseMoney,
  type Language, type Payment, type PaymentMethod, type Register } from '../domain/model';
import { paymentSplit, showAllocationBreakdown } from '../domain/payment-entry';
import { colors, sizes, spacing } from '../theme';

function amountInPaise(value: string): number {
  try { return parseMoney(value); } catch { return 0; }
}

function dateKey(date: Date): string {
  return monthKey(date) + '-' + String(date.getDate()).padStart(2, '0');
}

function shortBillingMonth(month: string, viewedMonth: string, language: Language): string {
  return new Date(month + '-01T12:00:00').toLocaleDateString(language === 'ml' ? 'ml-IN' : 'en-IN', {
    month: 'short', year: month.slice(0, 4) === viewedMonth.slice(0, 4) ? undefined : 'numeric',
  });
}

function creditThrough(state: Register, id: string, month: string): string {
  return state.bills.reduce((latest, bill) => bill.customerId === id && bill.month > latest ? bill.month : latest, month);
}

function receivedNames(images?: string): string[] {
  try {
    const names: unknown = JSON.parse(images ?? '[]');
    return Array.isArray(names) ? names.filter((name): name is string => typeof name === 'string' &&
      /^[a-zA-Z0-9-]+\.(jpg|jpeg|png|webp)$/.test(name)) : [];
  } catch {
    return [];
  }
}

function ActionCard({ icon, title, detail, onPress }: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; title: string; detail: string; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" onPress={onPress}
    style={({ pressed }) => [styles.card, styles.action, pressed && styles.pressed]}>
    <MaterialCommunityIcons name={icon} color={colors.blue} size={sizes.icon} />
    <View style={styles.fill}>
      <Label bold>{title}</Label>
      <Label variant="secondary" style={styles.supporting}>{detail}</Label>
    </View>
    <Icon name="chevron-right" />
  </Pressable>;
}

function RadioOption({ label, selected, onPress, detail, right, chip, calendar }: {
  label: string; selected: boolean; onPress: () => void; detail?: string; right?: string; chip?: boolean; calendar?: boolean;
}) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress}
    style={({ pressed }) => [styles.radio, chip && styles.radioChip, selected && styles.radioSelected, pressed && styles.pressed]}>
    <Icon name={selected ? 'radio-button-checked' : 'radio-button-unchecked'} size={20} color={selected ? colors.blue : colors.muted} />
    <View style={styles.fill}>
      <Label bold={selected || !chip}>{label}</Label>
      {detail && <Label variant="secondary" style={styles.supporting}>{detail}</Label>}
    </View>
    {right && <Label bold variant="secondary" style={styles.trailing}>{right}</Label>}
    {calendar && <Icon name="event" size={16} color={colors.navigationInk} />}
  </Pressable>;
}

export default function PaymentScreen() {
  const state = useRegister();
  const t = useWords();
  const { id, month = lastCompletedMonth(), images: receivedImages } = useLocalSearchParams<{ id: string; month?: string; images?: string }>();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / Math.max(1, fontScale) < 345;
  const household = state.households.find(entry => entry.id === id);
  const [amount, setAmount] = useState(() => String(paymentDefault(state, id) / 100));
  const [target, setTarget] = useState<string>();
  const [selection, setSelection] = useState<string>();
  const [sheet, setSheet] = useState<'allocation' | 'details'>();
  const [method, setMethod] = useState<PaymentMethod>();
  const [cash, setCash] = useState('');
  const [collectedOn, setCollectedOn] = useState<string>();
  const [images, setImages] = useState(() => receivedNames(receivedImages));
  const [calendar, setCalendar] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');

  if (!household) return <Screen title={t('Household not found', 'വീട് കണ്ടെത്തിയില്ല')} back>
    <Label>{t('Return to your register.', 'രജിസ്റ്ററിലേക്ക് മടങ്ങുക.')}</Label>
  </Screen>;

  const name = currentProfile(household).name;
  const bills = state.bills.filter(bill => bill.customerId === id).sort((left, right) => left.month.localeCompare(right.month));
  const { remaining } = ledger(state, id);
  const dues = bills.filter(bill => remaining[bill.id] > 0);
  const outstanding = dues.reduce((total, bill) => total + remaining[bill.id], 0);
  const value = amountInPaise(amount);
  const validAmount = value > 0 && value <= maxStoredAmount;
  const split = method === 'split' ? paymentSplit(value, amountInPaise(cash)) : undefined;
  const splitIncomplete = method === 'split' && !split;
  const now = new Date();
  const today = dateKey(now);
  const yesterday = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  const timestamp = now.toISOString();
  const preview = validAmount ? previewPayment(state, {
    id: 'preview', customerId: id, amount: value, targetMonth: target, creditAfter: creditThrough(state, id, month),
    images: [], enteredAt: timestamp, updatedAt: timestamp,
  }) : undefined;
  const allocations = preview?.allocations.preview ?? [];
  const credit = preview?.credits.preview ?? 0;
  const expanded = showAllocationBreakdown(allocations, credit, month);
  const applied = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  const title = t('Record payment', 'പണം രേഖപ്പെടുത്തുക');
  const oldest = t('Oldest unpaid bills first', 'പഴയ കുടിശ്ശിക ആദ്യം');
  const allocationTitle = t('Apply payment to', 'പണമടവ് വിനിയോഗിക്കുക');
  const detailsTitle = t('Payment details (optional)', 'പണമടവ് വിവരങ്ങൾ (ഐച്ഛികം)');
  const cashLabel = t('Cash', 'പണം');
  const bothLabel = t('Both', 'രണ്ടും');
  const methodLabel = splitIncomplete ? t('Complete the Cash/UPI split', 'പണവും UPI തുകയും നൽകുക') :
    method === 'cash' ? cashLabel : method === 'upi' ? 'UPI' : split ? cashLabel + ' ' + money(split.cash) + ' + UPI ' + money(split.upi) : '';
  const details = [
    methodLabel,
    collectedOn === today ? t('Today', 'ഇന്ന്') : collectedOn === yesterday ? t('Yesterday', 'ഇന്നലെ') : collectedOn,
    images.length === 1 ? t('1 image attached', '1 ചിത്രം ചേർത്തു') : images.length > 1 ? t(`${images.length} images attached`, `${images.length} ചിത്രങ്ങൾ ചേർത്തു`) : '',
  ].filter(Boolean).join(' · ');
  const specific = target ?? allocations[0]?.month;
  const scope = specific ? monthLabel(specific, state.language) : oldest;

  function openAllocation() {
    Keyboard.dismiss();
    setSelection(target);
    setSheet('allocation');
  }

  async function attach() {
    if (attaching) return;
    Keyboard.dismiss();
    setError('');
    setAttaching(true);
    try {
      const picked = await File.pickFileAsync({ mimeTypes: ['image/jpeg', 'image/png', 'image/webp'] });
      if (!picked.canceled) {
        const filename = await keepImage(picked.result.uri);
        setImages(current => [...current, filename]);
      }
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setAttaching(false);
    }
  }

  async function save() {
    if (saving.current || !validAmount || splitIncomplete || attaching) return;
    saving.current = true;
    Keyboard.dismiss();
    setBusy(true);
    setError('');
    try {
      const paymentId = newId();
      await changeRegister(current => {
        const enteredAt = new Date().toISOString();
        const payment: Payment = { id: paymentId, customerId: id, amount: value, targetMonth: target,
          creditAfter: creditThrough(current, id, month), method, split, images, collectedOn, enteredAt, updatedAt: enteredAt };
        current.payments.push(payment);
      }, { action: 'Recorded payment', customerId: id, name, amount: value, paymentId });
      router.replace({ pathname: '/balance', params: { id } });
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return <Screen title={title} canvas back footer={<Button title={title} onPress={save} busy={busy}
    disabled={!validAmount || splitIncomplete || attaching} />}>
    <View style={styles.identity}>
      <Label variant="title" bold accessibilityRole="header">{name}</Label>
      <Label variant="secondary" style={styles.supporting}>
        {t('Outstanding', 'കുടിശ്ശിക')} <Label bold>{money(outstanding)}</Label>
        {dues.length > 0 && dues.length <= 2 ? ' (' + dues.map(bill =>
          shortBillingMonth(bill.month, month, state.language) + '\u00a0' + money(remaining[bill.id])).join(', ') + ')' : ''}
        {dues.length > 2 ? ' · ' + t(`${dues.length} months`, `${dues.length} മാസം`) : ''}
      </Label>
    </View>
    <Field label={t('Payment amount (₹)', 'പണമടവ് തുക (₹)')} value={amount} onChangeText={text => setAmount(text.replace(/^0+(?=\d)/, ''))}
      selectTextOnFocus keyboardType="decimal-pad" style={styles.amountInput} />
    {expanded ? <View style={[styles.card, styles.allocationCard]}>
      <View style={styles.allocationHeader}>
        <MaterialCommunityIcons name="database-outline" color={colors.blue} size={sizes.icon} />
        <Label bold style={styles.fill}>{t('Payment allocation', 'പണമടവ് വിനിയോഗം')}</Label>
        <Pressable accessibilityRole="button" accessibilityLabel={t('Change allocation', 'വിനിയോഗം മാറ്റുക')} onPress={openAllocation}
          style={({ pressed }) => [styles.change, pressed && styles.pressed]}>
          <Label bold variant="secondary" style={styles.blue}>{t('Change', 'മാറ്റുക')}</Label>
        </Pressable>
      </View>
      {allocations.map(allocation => <View key={allocation.billId} style={styles.allocationLine}>
        <Label style={styles.fill}>{monthLabel(allocation.month, state.language)}</Label>
        <Label bold style={styles.trailing}>{money(allocation.amount)}</Label>
      </View>)}
      {applied > 0 && <View style={styles.confirmation}>
        <Icon name="check-circle" color={colors.paid} size={20} />
        <Label style={[styles.fill, styles.green]} bold variant="secondary">
          {allocations.length === 1 ? t(`${money(applied)} will be applied to 1 month`, `${money(applied)} 1 മാസത്തിലേക്ക് വിനിയോഗിക്കും`) :
            t(`${money(applied)} will be applied to ${allocations.length} months`, `${money(applied)} ${allocations.length} മാസങ്ങളിലേക്ക് വിനിയോഗിക്കും`)}
        </Label>
      </View>}
      {credit > 0 && <View style={styles.credit}>
        <Label bold style={styles.fill}>{t('Customer credit', 'മുൻകൂർ തുക')}</Label>
        <Label bold style={styles.trailing}>{money(credit)}</Label>
      </View>}
    </View> : <ActionCard title={allocationTitle} detail={scope} icon="database-outline" onPress={openAllocation} />}
    <ActionCard title={detailsTitle} detail={details || t('Method, collection date and image', 'രീതി, ലഭിച്ച തീയതി, ചിത്രം')}
      icon="receipt-text" onPress={() => { Keyboard.dismiss(); setSheet('details'); }} />
    <ErrorText message={sheet === 'details' ? '' : error} />

    {sheet === 'allocation' && <PaymentSheet title={allocationTitle} preferredHeight={172 + Math.min(bills.length, 8) * 53}
      onClose={() => setSheet(undefined)} footer={<Button title={t('Apply selection', 'പ്രയോഗിക്കുക')}
        onPress={() => { setTarget(selection); setSheet(undefined); }} />}>
      <Label variant="secondary" style={styles.supporting}>{t('Choose which bill receives this payment.', 'ഏത് ബില്ലിലേക്കാണ് പണമടവ് എന്ന് തിരഞ്ഞെടുക്കുക.')}</Label>
      <View accessibilityRole="radiogroup">
        <RadioOption label={oldest} detail={t('Automatically covers older dues', 'പഴയ കുടിശ്ശിക ആദ്യം അടയ്ക്കും')}
          selected={selection === undefined} onPress={() => setSelection(undefined)} />
        {bills.map(bill => <RadioOption key={bill.id} label={monthLabel(bill.month, state.language)}
          right={t(`${money(remaining[bill.id])} due`, `${money(remaining[bill.id])} ബാക്കി`)}
          selected={selection === bill.month} onPress={() => setSelection(bill.month)} />)}
      </View>
    </PaymentSheet>}

    {sheet === 'details' && <PaymentSheet title={detailsTitle}
      preferredHeight={method === 'split' || images.length || stacked ? 550 : 320}
      onClose={() => { Keyboard.dismiss(); setSheet(undefined); }}>
      <Label bold>{t('Payment method', 'പണമടവ് രീതി')}</Label>
      <View accessibilityRole="radiogroup" style={stacked ? styles.stackedOptions : styles.chips}>
        {([['cash', cashLabel], ['upi', 'UPI'], ['split', bothLabel]] as const).map(([option, label]) =>
          <RadioOption key={option} chip label={label} selected={method === option}
            onPress={() => setMethod(current => current === option ? undefined : option)} />)}
      </View>
      {method === 'split' && <View style={styles.split}>
        <Field label={t('Cash amount (₹)', 'പണമായി ലഭിച്ചത് (₹)')} value={cash} onChangeText={setCash} keyboardType="decimal-pad"
          selectTextOnFocus style={styles.cashInput} />
        <View style={styles.allocationLine}>
          <Label bold style={styles.fill}>{t('UPI remainder', 'UPI വഴി ലഭിച്ച ബാക്കി')}</Label>
          <Label bold>{split ? money(split.upi) : '—'}</Label>
        </View>
        {splitIncomplete && <Label variant="secondary" style={styles.supporting}>
          {t('Enter a cash amount above ₹0 and below the payment total.', 'പണമായി ലഭിച്ച തുക ₹0-നേക്കാൾ കൂടുതലും ആകെ തുകയേക്കാൾ കുറവുമാകണം.')}
        </Label>}
      </View>}
      <Label bold>{t('Collection date', 'ലഭിച്ച തീയതി')}</Label>
      <View accessibilityRole="radiogroup" style={stacked ? styles.stackedOptions : styles.chips}>
        <RadioOption chip label={t('Today', 'ഇന്ന്')} selected={collectedOn === today}
          onPress={() => setCollectedOn(collectedOn === today ? undefined : today)} />
        <RadioOption chip label={t('Yesterday', 'ഇന്നലെ')} selected={collectedOn === yesterday}
          onPress={() => setCollectedOn(collectedOn === yesterday ? undefined : yesterday)} />
        <RadioOption chip calendar label={t('Other', 'മറ്റൊന്ന്')} selected={!!collectedOn && collectedOn !== today && collectedOn !== yesterday}
          onPress={() => { Keyboard.dismiss(); setSheet(undefined); setCalendar(true); }} />
      </View>
      {collectedOn && collectedOn !== today && collectedOn !== yesterday && <View style={styles.dateRow}>
        <Label style={styles.fill}>{collectedOn}</Label>
        <IconButton name="close" label={t('Clear date', 'തീയതി നീക്കുക')} onPress={() => setCollectedOn(undefined)} />
      </View>}
      <ActionCard icon="camera" title={t('Attach payment image', 'പണമടവിന്റെ ചിത്രം ചേർക്കുക')}
        detail={attaching ? t('Opening files…', 'ഫയലുകൾ തുറക്കുന്നു…') : t('Receipt, UPI screenshot, or other proof', 'രസീത്, UPI സ്ക്രീൻഷോട്ട്, അല്ലെങ്കിൽ മറ്റു തെളിവ്')}
        onPress={() => void attach()} />
      {images.map(image => <View key={image} style={styles.attachment}>
        <Image source={{ uri: imageUri(image) }} accessibilityLabel={t('Attached payment image', 'പണമടവിനൊപ്പം ചേർത്ത ചിത്രം')} style={styles.image} />
        <Button secondary title={t('Remove image', 'ചിത്രം നീക്കുക')} onPress={() => setImages(current => current.filter(name => name !== image))} />
      </View>)}
      <ErrorText message={error} />
    </PaymentSheet>}
    {calendar && <DateTimePicker value={collectedOn ? new Date(collectedOn + 'T12:00:00') : now} mode="date" maximumDate={now}
      onChange={(event, date) => {
        setCalendar(false);
        if (event.type === 'set' && date) setCollectedOn(dateKey(date));
        setSheet('details');
      }} />}
  </Screen>;
}

const styles = StyleSheet.create({
  identity: { gap: spacing.xs },
  supporting: { color: colors.navigationInk },
  fill: { flex: 1 },
  trailing: { flexShrink: 1, maxWidth: '40%', textAlign: 'right' },
  amountInput: { minHeight: 62, backgroundColor: colors.selected, color: colors.ink, fontSize: sizes.amount,
    fontWeight: '700', borderRadius: sizes.radius, borderBottomWidth: 0, paddingHorizontal: spacing.lg },
  card: { backgroundColor: colors.surface, borderRadius: sizes.panelRadius, borderWidth: 1, borderColor: colors.softBorder },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 66 },
  allocationCard: { padding: spacing.md, gap: spacing.sm },
  allocationHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  change: { minHeight: sizes.touch, justifyContent: 'center', borderColor: colors.blue, borderWidth: 1,
    borderRadius: sizes.panelRadius, paddingHorizontal: spacing.sm, maxWidth: '40%' },
  blue: { color: colors.blue, textAlign: 'center' },
  allocationLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.softBorder },
  confirmation: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.paidSurface, borderRadius: sizes.radius, padding: spacing.sm },
  green: { color: colors.paid },
  credit: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.panel, borderRadius: sizes.radius, padding: spacing.sm },
  radio: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.softBorder },
  radioChip: { borderRadius: sizes.panelRadius, flexGrow: 1, flexBasis: 0, minWidth: 78, borderWidth: 1 },
  radioSelected: { backgroundColor: colors.selected, borderRadius: sizes.radius },
  chips: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  stackedOptions: { gap: spacing.xs },
  split: { gap: spacing.xs, backgroundColor: colors.panel, borderRadius: sizes.radius, padding: spacing.md },
  cashInput: { backgroundColor: colors.surface, borderRadius: sizes.radius, paddingHorizontal: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  attachment: { backgroundColor: colors.canvas, padding: spacing.sm, gap: spacing.sm, borderRadius: sizes.radius },
  image: { width: '100%', height: 160, resizeMode: 'contain' },
  pressed: { opacity: 0.67 },
});
