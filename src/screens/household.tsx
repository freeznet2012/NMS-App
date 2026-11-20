import React, { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Choice, ErrorText, Field, Icon, IconButton, Label, Screen, useWords } from '../components/ui';
import { MonthPicker } from '../components/month-picker';
import { PeriodicalPicker } from '../components/periodical-picker';
import { changeRegister, newId, useRegister } from '../data/store';
import {
  currentProfile, maxStoredAmount, monthKey, monthlyItemsAt, parseMoney, profileAt, withCopyCount, type CustomBillItem, type Subscription,
} from '../domain/model';
import { saveHousehold } from '../domain/households';
import { colors, sizes, spacing } from '../theme';

type FieldIcon = React.ComponentProps<typeof Icon>['name'];
type ChoiceField = 'route' | 'boy' | 'after';
type MonthlyItemField = Omit<CustomBillItem, 'amount'> & { amount: string };

function itemFields(items: CustomBillItem[]): MonthlyItemField[] {
  return items.map(item => ({ ...item, amount: String(item.amount / 100) }));
}

function FormField({ icon, title, required, children }: {
  icon: FieldIcon; title: string; required?: boolean; children: React.ReactNode;
}) {
  return <View style={styles.formField}>
    <Icon name={icon} color={colors.blue} />
    <View style={styles.formFieldContent}>
      <Label bold style={styles.fieldTitle}>{title}{required && <Label bold style={styles.required}> *</Label>}</Label>
      {children}
    </View>
  </View>;
}

function SelectField({ icon, title, value, placeholder, onPress }: {
  icon: FieldIcon; title: string; value?: string; placeholder: string; onPress: () => void;
}) {
  return <FormField icon={icon} title={title}>
    <Pressable accessibilityRole="button" accessibilityLabel={title + ', ' + (value ?? placeholder)} onPress={onPress}
      style={({ pressed }) => [styles.outlined, styles.selector, pressed && styles.pressed]}>
      <Label style={[styles.selectorValue, !value && styles.muted]}>{value ?? placeholder}</Label>
      <Icon name="keyboard-arrow-down" color={colors.navigationInk} />
    </Pressable>
  </FormField>;
}

function SectionHeading({ icon, children }: { icon: FieldIcon; children: React.ReactNode }) {
  return <View style={styles.sectionHeading}>
    <Icon name={icon} color={colors.blue} />
    <Label variant="headline" bold accessibilityRole="header" style={styles.heading}>{children}</Label>
  </View>;
}

export default function HouseholdScreen() {
  const state = useRegister();
  const t = useWords();
  const params = useLocalSearchParams<{ id?: string; routeId?: string }>();
  const existing = state.households.find(household => household.id === params.id);
  const previous = existing && currentProfile(existing);
  const [customerId] = useState(() => params.id ?? newId());
  const [name, setName] = useState(previous?.name ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [routeId, setRoute] = useState(previous?.routeId ?? params.routeId ?? '');
  const [boyId, setBoy] = useState(previous?.boyId ?? '');
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [active, setActive] = useState(previous?.active ?? true);
  const [afterId, setAfter] = useState(() => {
    if (!previous) return '';
    return state.households.filter(household => household.id !== customerId)
      .map(household => ({ id: household.id, profile: currentProfile(household) }))
      .filter(({ profile }) => profile.routeId === previous.routeId && profile.position < previous.position)
      .sort((left, right) => right.profile.position - left.profile.position)[0]?.id ?? '';
  });
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(previous?.subscriptions ?? []);
  const scheduledItems = existing ? monthlyItemsAt(existing, month) : [];
  const [monthlyFields, setMonthlyFields] = useState(() => itemFields(scheduledItems));
  const [special, setSpecial] = useState<Record<string, string>>(() => Object.fromEntries(
    (previous?.subscriptions ?? []).filter(subscription => subscription.specialRate !== undefined)
      .map(subscription => [subscription.periodicalId, String(subscription.specialRate! / 100)]),
  ));
  const [choice, setChoice] = useState<ChoiceField>();
  const [showPeriodicals, setShowPeriodicals] = useState(false);
  const [details, setDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');

  const stops = state.households.filter(household => household.id !== customerId)
    .flatMap(household => {
      const profile = profileAt(household, month);
      return profile?.routeId === routeId ? [{ id: household.id, profile }] : [];
    }).sort((left, right) => left.profile.position - right.profile.position);
  const preceding = stops.find(stop => stop.id === afterId)?.profile;
  const firstStop = t('First stop', 'ആദ്യ സ്ഥാനം');
  const stopValue = !afterId ? firstStop : preceding && t(`After ${preceding.name}`, `${preceding.name} ശേഷം`);
  const choose = t('Choose', 'തിരഞ്ഞെടുക്കുക');
  const papers = new Map(state.periodicals.map(paper => [paper.id, paper]));
  const selectedCount = t(`${subscriptions.length} selected`, `${subscriptions.length} തിരഞ്ഞെടുത്തു`);
  const periodicalAction = subscriptions.length ? t('Change', 'മാറ്റുക') : t('Select periodicals', 'പത്രങ്ങൾ തിരഞ്ഞെടുക്കുക');
  const routeLabel = t('Route', 'റൂട്ട്');
  const personLabel = t('Delivery person', 'വിതരണക്കാരൻ');
  const positionLabel = t('Stop position', 'വിതരണ സ്ഥാനം');
  const nameLabel = t('Customer name', 'ഉപഭോക്താവിന്റെ പേര്');
  const options = choice === 'route' ? state.routes.map(route => ({ value: route.id, label: route.name })) :
    choice === 'boy' ? state.boys.map(boy => ({ value: boy.id, label: boy.name })) :
      [{ value: '', label: firstStop }, ...stops.map(({ id, profile }) => ({ value: id, label: profile.position + '. ' + profile.name }))];

  function openChoice(field: ChoiceField) {
    Keyboard.dismiss();
    setChoice(field);
  }

  function chooseValue(value: string) {
    if (choice === 'route') {
      if (value !== routeId) setAfter('');
      setRoute(value);
    } else if (choice === 'boy') {
      setBoy(value);
    } else {
      setAfter(value);
    }
  }

  function changeCopies(periodicalId: string, change: number) {
    setSubscriptions(list => list.map(subscription => subscription.periodicalId === periodicalId ?
      { ...subscription, quantity: Math.min(100, Math.max(1, subscription.quantity + change)) } : subscription));
  }

  function changeMonth(next: string) {
    if (existing && JSON.stringify(monthlyFields) === JSON.stringify(itemFields(scheduledItems))) {
      setMonthlyFields(itemFields(monthlyItemsAt(existing, next)));
    }
    setMonth(next);
  }

  function updateMonthlyField(id: string, key: 'name' | 'amount', value: string) {
    setMonthlyFields(list => list.map(item => item.id === id ? { ...item, [key]: value } : item));
  }

  async function save() {
    if (saving.current) return;
    saving.current = true;
    Keyboard.dismiss();
    setBusy(true);
    setError('');
    try {
      const items = monthlyFields.map(item => {
        const name = item.name.trim();
        if (!name) throw new Error(t('Enter a name for each monthly custom item.', 'ഓരോ പ്രതിമാസ ഇനത്തിനും പേര് നൽകുക.'));
        const amount = parseMoney(item.amount);
        if (amount <= 0 || amount > maxStoredAmount) {
          throw new Error(t('Enter a valid monthly charge above ₹0.', '₹0-ൽ കൂടുതലുള്ള ശരിയായ പ്രതിമാസ തുക നൽകുക.'));
        }
        return { id: item.id, name, amount };
      });
      const changedItems = items.length !== scheduledItems.length || items.some((item, i) =>
        item.id !== scheduledItems[i].id || item.name !== scheduledItems[i].name || item.amount !== scheduledItems[i].amount);
      if (active && !subscriptions.length && !items.length) {
        throw new Error(t('Select a periodical or add a monthly custom item.', 'ഒരു പത്രമോ പ്രതിമാസ ഇനമോ ചേർക്കുക.'));
      }
      const subs = subscriptions.map(subscription => {
        const value = special[subscription.periodicalId]?.trim();
        const specialRate = value ? parseMoney(value) : undefined;
        const oldSpecial = previous?.subscriptions.find(candidate => candidate.periodicalId === subscription.periodicalId);
        return { ...subscription, specialRate,
          specialSince: specialRate === undefined ? undefined : oldSpecial?.specialRate === specialRate ? oldSpecial.specialSince ?? month : month };
      });
      await changeRegister(draft => saveHousehold(draft, {
        id: customerId, phone, afterId, profile: { month, name, routeId, boyId, position: 1, active, subscriptions: subs },
        monthlyItems: changedItems ? items : undefined,
      }), { action: existing ? 'Updated household' : 'Added household', customerId, name,
        route: state.routes.find(route => route.id === routeId)?.name });
      router.back();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
      saving.current = false;
    }
  }

  const title = existing ? t('Edit household', 'വീട് തിരുത്തുക') : t('Add household', 'വീട് ചേർക്കുക');
  return <Screen title={title} titleVariant="pageTitle" canvas back
    footer={<><ErrorText message={error} /><Button title={existing ? t('Save changes', 'മാറ്റങ്ങൾ സൂക്ഷിക്കുക') : title}
      icon={existing ? 'check' : 'add-circle-outline'} onPress={save} busy={busy} /></>}>
    <View style={styles.form}>
      <FormField icon="person-outline" title={nameLabel} required>
        <TextInput accessibilityLabel={nameLabel} maxLength={200} value={name} onChangeText={setName}
          placeholder={t('Enter household name', 'വീടിന്റെ പേര് നൽകുക')} placeholderTextColor={colors.muted}
          autoCapitalize="words" style={[styles.outlined, styles.nameInput, state.language === 'ml' && styles.malayalam]} />
      </FormField>
      <SelectField icon="place" title={routeLabel} value={state.routes.find(route => route.id === routeId)?.name}
        placeholder={choose} onPress={() => openChoice('route')} />
      <SelectField icon="person-outline" title={personLabel} value={state.boys.find(boy => boy.id === boyId)?.name}
        placeholder={choose} onPress={() => openChoice('boy')} />
      <SelectField icon="format-list-bulleted" title={positionLabel} value={stopValue}
        placeholder={choose} onPress={() => openChoice('after')} />

      <View style={styles.section}>
        <SectionHeading icon="library-books">{t('Newspapers & periodicals', 'പത്രങ്ങളും ആനുകാലികങ്ങളും')}</SectionHeading>
        <View style={styles.paperCard}>
          <View style={styles.paperHeader}>
            <Label bold style={styles.paperCount}>{selectedCount}</Label>
            <Pressable accessibilityRole="button" accessibilityLabel={subscriptions.length ? t('Change periodicals', 'പത്രങ്ങൾ മാറ്റുക') : periodicalAction}
              onPress={() => { Keyboard.dismiss(); setShowPeriodicals(true); }}
              style={({ pressed }) => [styles.changeButton, pressed && styles.pressed]}>
              <Label bold style={styles.actionText}>{periodicalAction}</Label>
            </Pressable>
          </View>
          {subscriptions.length > 0 && <View style={styles.chips}>
            {subscriptions.map(subscription => {
              const paper = papers.get(subscription.periodicalId);
              const label = paper?.code ?? subscription.periodicalId;
              return <Pressable key={subscription.periodicalId} accessibilityRole="button"
                accessibilityLabel={t('Remove ', 'നീക്കുക ') + withCopyCount(paper?.name ?? label, subscription.quantity)}
                onPress={() => setSubscriptions(list => list.filter(item => item.periodicalId !== subscription.periodicalId))}
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
                <Label bold style={styles.chipText}>{withCopyCount(label, subscription.quantity)}</Label>
                <Icon name="close" color={colors.blue} size={18} />
              </Pressable>;
            })}
          </View>}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeading icon="calendar-today">{t('Delivery & billing', 'വിതരണവും ബില്ലിംഗും')}</SectionHeading>
        <MonthPicker label={t('Changes apply from', 'മാറ്റങ്ങൾ ബാധകമാകുന്ന മാസം')}
          title={t('Select effective month', 'മാറ്റങ്ങൾ ബാധകമാകുന്ന മാസം തിരഞ്ഞെടുക്കുക')} value={month} onChange={changeMonth} />
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: active }} onPress={() => setActive(value => !value)}
          style={({ pressed }) => [styles.delivery, pressed && styles.pressed]}>
          <Icon name={active ? 'check-box' : 'check-box-outline-blank'} color={active ? colors.navigationActive : colors.navigationInk} />
          <Label bold style={styles.heading}>{t('Deliver from this month', 'ഈ മാസം മുതൽ വിതരണം')}</Label>
        </Pressable>
        <View style={styles.note}>
          <Icon name="info-outline" color={colors.muted} size={21} />
          <Label variant="secondary" style={styles.noteText}>{t('Prepared bills stay unchanged. Correct an existing bill from its customer screen.',
            'തയ്യാറാക്കിയ ബില്ലുകൾ മാറില്ല. നിലവിലെ ബിൽ ഉപഭോക്താവിന്റെ സ്ക്രീനിൽ തിരുത്താം.')}</Label>
        </View>
      </View>

      <View style={styles.details}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: details }} onPress={() => setDetails(value => !value)}
          style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}>
          <Icon name="phone" color={colors.blue} />
          <Label bold variant="headline" style={styles.heading}>{t('Optional details', 'ഐച്ഛിക വിവരങ്ങൾ')}</Label>
          <Icon name={details ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} color={colors.navigationInk} />
        </Pressable>
        {details && <View style={styles.detailsContent}>
          <Field label={t('Phone (optional)', 'ഫോൺ (ഐച്ഛികം)')} value={phone} onChangeText={setPhone}
            keyboardType="phone-pad" maxLength={50} style={styles.outlined} />
          <View style={styles.subscription}>
            <Label bold variant="headline" accessibilityRole="header">{t('Monthly custom items', 'പ്രതിമാസ ഇനങ്ങൾ')}</Label>
            <Label variant="secondary" style={styles.muted}>{t('Added to new bills from the selected month while delivery is active.',
              'വിതരണം തുടരുമ്പോൾ തിരഞ്ഞെടുത്ത മാസം മുതൽ പുതിയ ബില്ലുകളിൽ ചേർക്കും.')}</Label>
            {monthlyFields.map(item => <View key={item.id} style={styles.monthlyItem}>
              <View style={styles.monthlyFields}>
                <Field label={t('Item name', 'ഇനത്തിന്റെ പേര്')} value={item.name} maxLength={200}
                  onChangeText={value => updateMonthlyField(item.id, 'name', value)} style={styles.outlined} />
                <Field label={t('Monthly amount (₹)', 'പ്രതിമാസ തുക (₹)')} value={item.amount} keyboardType="decimal-pad"
                  onChangeText={value => updateMonthlyField(item.id, 'amount', value)} style={styles.outlined} />
              </View>
              <IconButton name="delete-outline" label={item.name ? t(`Remove ${item.name}`, `${item.name} നീക്കുക`) :
                t('Remove monthly custom item', 'പ്രതിമാസ ഇനം നീക്കുക')}
                onPress={() => setMonthlyFields(list => list.filter(entry => entry.id !== item.id))} />
            </View>)}
            <Button secondary icon="add" title={t('Add monthly item', 'പ്രതിമാസ ഇനം ചേർക്കുക')}
              onPress={() => setMonthlyFields(list => [...list, { id: newId(), name: '', amount: '' }])} />
          </View>
          {subscriptions.map(subscription => {
            const { periodicalId, quantity } = subscription;
            const paper = papers.get(periodicalId);
            return <View key={periodicalId} style={styles.subscription}>
              <Label bold>{paper?.name ?? periodicalId}</Label>
              <Label variant="secondary">{t('Copies', 'കോപ്പികൾ')} · {quantity}</Label>
              <View style={styles.stepper}>
                <Button secondary title="−" disabled={quantity <= 1} onPress={() => changeCopies(periodicalId, -1)} />
                <Button secondary title="+" disabled={quantity >= 100} onPress={() => changeCopies(periodicalId, 1)} />
              </View>
              <Field label={t('Special monthly price per copy (optional)', 'പ്രത്യേക മാസവില (ഐച്ഛികം)')}
                value={special[periodicalId] ?? ''} onChangeText={value => setSpecial(values => ({ ...values, [periodicalId]: value }))}
                keyboardType="decimal-pad" style={styles.outlined} />
            </View>;
          })}
        </View>}
      </View>
      {(!state.routes.length || !state.boys.length) && <Label variant="secondary" style={styles.muted}>
        {t('Add routes and delivery people in Manage first.', 'ആദ്യം ക്രമീകരണത്തിൽ റൂട്ടുകളും വിതരണക്കാരും ചേർക്കുക.')}
      </Label>}
    </View>
    {choice && <Choice title={choice === 'route' ? routeLabel : choice === 'boy' ? personLabel : positionLabel}
      options={options} onChoose={chooseValue} onDismiss={() => setChoice(undefined)} />}
    {showPeriodicals && <PeriodicalPicker subscriptions={subscriptions} onDismiss={() => setShowPeriodicals(false)}
      onApply={next => { setSubscriptions(next); setShowPeriodicals(false); }} />}
  </Screen>;
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  formField: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg, paddingHorizontal: spacing.sm },
  formFieldContent: { flex: 1, gap: spacing.xs },
  fieldTitle: { color: colors.darkBlue },
  required: { color: colors.error },
  outlined: { minHeight: sizes.touch, borderWidth: 1, borderColor: colors.disabledText, borderRadius: sizes.radius,
    paddingHorizontal: spacing.md, backgroundColor: colors.surface },
  nameInput: { fontSize: sizes.body, color: colors.ink, paddingVertical: spacing.sm },
  malayalam: { fontFamily: 'Malayalam' },
  selector: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.sm },
  selectorValue: { flex: 1 },
  muted: { color: colors.muted },
  section: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, padding: spacing.sm, paddingTop: spacing.md, gap: spacing.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingBottom: spacing.xs },
  heading: { flex: 1, color: colors.darkBlue },
  paperCard: { padding: spacing.md, paddingTop: spacing.xs, borderRadius: sizes.panelRadius, borderWidth: 1,
    borderColor: colors.softBorder, backgroundColor: colors.surface, gap: spacing.xs },
  paperHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  paperCount: { flex: 1 },
  changeButton: { minHeight: sizes.touch, minWidth: sizes.touch, maxWidth: '65%', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: colors.blue, borderRadius: sizes.radius, paddingHorizontal: spacing.md },
  actionText: { color: colors.blue, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: sizes.touch, maxWidth: '100%', paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.selected, borderRadius: sizes.panelRadius },
  chipText: { flexShrink: 1 },
  delivery: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xs },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  noteText: { flex: 1, color: colors.muted },
  details: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.divider },
  detailsButton: { minHeight: 60, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  detailsContent: { padding: spacing.sm, gap: spacing.lg },
  subscription: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, paddingTop: spacing.md, gap: spacing.sm },
  monthlyItem: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.sm, backgroundColor: colors.panel, borderRadius: sizes.radius },
  monthlyFields: { flex: 1, gap: spacing.sm },
  stepper: { flexDirection: 'row', gap: spacing.md },
  pressed: { opacity: 0.7 },
});
