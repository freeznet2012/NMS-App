import React, { useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, TextInput, View, useWindowDimensions, type TextInputProps } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Button, Choice, ErrorText, Icon, IconButton, Label, Screen, useWords } from '../components/ui';
import { MonthPicker } from '../components/month-picker';
import { changeRegister, newId, useRegister } from '../data/store';
import { maxStoredAmount, money, monthKey, monthLabel, parseMoney, rateAt } from '../domain/model';
import { savePeriodical, searchPeriodicals, type PeriodicalSort } from '../domain/periodicals';
import { colors, sizes, spacing } from '../theme';

type Filter = 'all' | 'active' | 'inactive';

export function PeriodicalsScreen() {
  const { periodicals, language } = useRegister();
  const t = useWords();
  const { width, fontScale } = useWindowDimensions();
  const compact = width / Math.max(fontScale, 1) < 350;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<PeriodicalSort>('name');
  const [showSort, setShowSort] = useState(false);
  const month = monthKey(new Date());
  const ordered = searchPeriodicals(periodicals, query, sort, language === 'ml' ? 'ml-IN' : 'en-IN');
  const inactiveCount = ordered.filter(paper => paper.inactive).length;
  const visible = filter === 'all' ? ordered : ordered.filter(paper => !!paper.inactive === (filter === 'inactive'));
  const sortOptions = [
    { value: 'name', label: t('Name A–Z', 'പേര് A–Z') },
    { value: 'nameDesc', label: t('Name Z–A', 'പേര് Z–A') },
    { value: 'code', label: t('Code A–Z', 'കോഡ് A–Z') },
  ];
  const add = <Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); router.push('/periodical'); }}
    style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
    <Icon name="add" size={22} color={colors.surface} />
    <Label bold style={styles.white}>{t('Add periodical', 'പത്രം ചേർക്കുക')}</Label>
  </Pressable>;

  return <Screen title={t('Periodicals', 'പത്രങ്ങൾ')} titleVariant="pageTitle" back canvas scroll={false} right={!compact ? add : undefined}>
    {compact && <View style={styles.addBelow}>{add}</View>}
    <View style={styles.search}>
      <Icon name="search" color={colors.muted} />
      <TextInput accessibilityLabel={t('Search periodicals by name or code', 'പേരോ കോഡോ ഉപയോഗിച്ച് പത്രങ്ങൾ തിരയുക')}
        placeholder={compact ? t('Search periodicals', 'പത്രങ്ങൾ തിരയുക') : t('Search periodicals (name or code)', 'പത്രങ്ങൾ തിരയുക (പേര് അല്ലെങ്കിൽ കോഡ്)')}
        value={query} onChangeText={setQuery} autoCorrect={false} placeholderTextColor={colors.muted}
        style={[styles.searchInput, language === 'ml' && styles.malayalam]} />
      {!!query && <IconButton name="clear" label={t('Clear search', 'തിരച്ചിൽ മായ്ക്കുക')} onPress={() => setQuery('')} />}
    </View>
    <View style={[styles.controls, compact && styles.controlsStacked]}>
      <View style={styles.filters} accessibilityRole="tablist">
        {([
          ['all', t('All', 'എല്ലാം'), ordered.length],
          ['active', t('Active', 'സജീവം'), ordered.length - inactiveCount],
          ['inactive', t('Inactive', 'നിഷ്ക്രിയം'), inactiveCount],
        ] as const).map(([key, label, count]) => <Pressable key={key} accessibilityRole="tab"
          accessibilityState={{ selected: filter === key }} onPress={() => setFilter(key)}
          style={({ pressed }) => [styles.pill, styles.filter, filter === key && styles.selected, pressed && styles.pressed]}>
          <Label variant="secondary" style={filter === key ? styles.white : undefined}>{label} ({count})</Label>
        </Pressable>)}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Sort periodicals', 'പത്രങ്ങൾ ക്രമപ്പെടുത്തുക')}
        onPress={() => { Keyboard.dismiss(); setShowSort(true); }}
        style={({ pressed }) => [styles.pill, styles.sort, pressed && styles.pressed]}>
        <MaterialCommunityIcons name="sort" size={18} color={colors.navigationInk} />
        <Label variant="secondary">{sortOptions.find(option => option.value === sort)?.label}</Label>
        <Icon name="keyboard-arrow-down" size={18} />
      </Pressable>
    </View>
    <FlatList data={visible} keyExtractor={paper => paper.id} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}
      ListEmptyComponent={<Label style={styles.muted}>{query.trim() ? t('No periodicals match your search.', 'തിരച്ചിലുമായി പൊരുത്തപ്പെടുന്ന പത്രങ്ങളില്ല.') :
        t('No periodicals in this list.', 'ഈ പട്ടികയിൽ പത്രങ്ങളില്ല.')}</Label>}
      renderItem={({ item }) => {
        const rate = rateAt(item, month);
        const next = !rate ? [...item.rates].sort((left, right) => left.month.localeCompare(right.month))[0] : undefined;
        const price = rate ? t(`${money(rate.amount)} / month`, `മാസം ${money(rate.amount)}`) :
          next ? t(`${money(next.amount)} from ${monthLabel(next.month, language)}`, `${monthLabel(next.month, language)} മുതൽ ${money(next.amount)}`) : '';
        return <Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); router.push({ pathname: '/periodical', params: { id: item.id } }); }}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <View style={styles.iconTile}><MaterialCommunityIcons name="newspaper-variant-outline" size={27} color={colors.blue} /></View>
          <View style={styles.flex}>
            <Label bold variant="headline">{item.name}</Label>
            <Label style={styles.detail}>{[item.code, price, item.inactive && t('Inactive', 'നിഷ്ക്രിയം')].filter(Boolean).join(' · ')}</Label>
          </View>
          <Icon name="chevron-right" size={22} />
        </Pressable>;
      }} />
    {showSort && <Choice title={t('Sort periodicals', 'പത്രങ്ങൾ ക്രമപ്പെടുത്തുക')} options={sortOptions}
      onChoose={value => setSort(value as PeriodicalSort)} onDismiss={() => setShowSort(false)} />}
  </Screen>;
}

function CatalogField({ label, info, ...input }: TextInputProps & { label: string; info?: string }) {
  const { language } = useRegister();
  return <View style={styles.field}>
    <Label bold>{label}<Label bold style={styles.required}> *</Label></Label>
    <View style={styles.outlined}>
      <TextInput {...input} accessibilityLabel={label} placeholderTextColor={colors.muted}
        style={[styles.input, language === 'ml' && styles.malayalam]} />
      {info && <Icon name="info-outline" color={colors.muted} size={21} />}
    </View>
    {info && <Label variant="secondary" style={styles.detail}>{info}</Label>}
  </View>;
}

export function PeriodicalEditor() {
  const state = useRegister();
  const t = useWords();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = state.periodicals.find(paper => paper.id === id);
  const [recordId] = useState(() => id ?? newId());
  const [month, setMonth] = useState(() => {
    const current = monthKey(new Date());
    return existing && !rateAt(existing, current)
      ? [...existing.rates].sort((left, right) => left.month.localeCompare(right.month))[0].month : current;
  });
  const [name, setName] = useState(existing?.name ?? '');
  const [code, setCode] = useState(existing?.code ?? '');
  const effectivePrice = (value: string) => {
    const rate = existing && rateAt(existing, value);
    return rate ? String(rate.amount / 100) : '';
  };
  const [price, setPrice] = useState(() => effectivePrice(month));
  const [inactive, setInactive] = useState(!!existing?.inactive);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const title = existing ? t('Edit periodical', 'പത്രം തിരുത്തുക') : t('Add periodical', 'പത്രം ചേർക്കുക');

  async function save() {
    if (saving.current) return;
    saving.current = true;
    Keyboard.dismiss();
    setBusy(true);
    setError('');
    try {
      const label = name.trim();
      const normalized = code.trim().toUpperCase();
      if (!label) throw new Error(t('Enter a periodical name.', 'പത്രത്തിന്റെ പേര് നൽകുക.'));
      if (!/^[A-Z]{2,4}$/.test(normalized) && existing?.code.toUpperCase() !== normalized) {
        throw new Error(t('Use a code of 2–4 letters.', '2–4 ഇംഗ്ലീഷ് അക്ഷരങ്ങളുള്ള കോഡ് നൽകുക.'));
      }
      const amount = parseMoney(price);
      if (amount > maxStoredAmount) throw new Error(t('Enter a valid monthly price.', 'ശരിയായ മാസവില നൽകുക.'));
      await changeRegister(draft => savePeriodical(draft, { id: recordId, month, name: label, code: normalized, amount, inactive }),
        { action: existing ? 'Updated periodicals' : 'Added periodicals', name: label });
      router.back();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  if (id && !existing) return <Screen title={title} back><Label>{t('Periodical not found.', 'പത്രം കണ്ടെത്തിയില്ല.')}</Label></Screen>;

  return <Screen title={title} titleVariant="pageTitle" back canvas footer={<>
    <ErrorText message={error} />
    <Button title={t('Save periodical', 'പത്രം സൂക്ഷിക്കുക')} onPress={save} busy={busy} />
  </>}>
    <View style={styles.form}>
      <CatalogField label={t('Periodical name', 'പത്രത്തിന്റെ പേര്')} placeholder={t('e.g. Malayala Manorama', 'ഉദാ. മലയാള മനോരമ')}
        value={name} onChangeText={setName} maxLength={200} />
      <CatalogField label={t('Short code', 'ചുരുക്ക കോഡ്')} placeholder={t('e.g. MM', 'ഉദാ. MM')} value={code}
        onChangeText={value => setCode(value.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={Math.max(4, existing?.code.length ?? 0)}
        info={t('A short, unique code (2–4 letters) used in bills and reports.', 'ബില്ലുകളിലും റിപ്പോർട്ടുകളിലും ഉപയോഗിക്കുന്ന 2–4 അക്ഷരങ്ങളുള്ള തനത് കോഡ്.')} />
      <CatalogField label={t('Monthly price (₹)', 'മാസവില (₹)')} placeholder={t('e.g. 300', 'ഉദാ. 300')}
        value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
      <MonthPicker label={t('Price applies from', 'വില ബാധകമാകുന്ന മാസം')}
        title={t('Select price start month', 'വില തുടങ്ങുന്ന മാസം തിരഞ്ഞെടുക്കുക')} value={month} onChange={next => {
          if (existing && price === effectivePrice(month)) setPrice(effectivePrice(next));
          setMonth(next);
        }} />
      <View style={styles.note}><Icon name="info-outline" color={colors.muted} />
        <Label style={[styles.detail, styles.flex]}>{t('A changed usual price replaces special prices from this month. Existing bills keep their saved prices.',
          'സാധാരണ വില മാറിയാൽ ഈ മാസം മുതൽ പ്രത്യേക വിലകൾ ഒഴിവാകും. നിലവിലെ ബില്ലുകൾ മാറില്ല.')}</Label>
      </View>
      {existing && <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !inactive }} onPress={() => setInactive(value => !value)}
        style={({ pressed }) => [styles.status, pressed && styles.pressed]}>
        <Icon name={inactive ? 'check-box-outline-blank' : 'check-box'} color={colors.blue} />
        <View style={styles.flex}>
          <Label bold>{t('Active', 'സജീവം')}</Label>
          <Label variant="secondary" style={styles.detail}>{t('Available for new selections.', 'പുതിയ തിരഞ്ഞെടുപ്പുകൾക്ക് ലഭ്യമാണ്.')}</Label>
        </View>
      </Pressable>}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  add: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    borderRadius: spacing.xl, backgroundColor: colors.navigationActive, paddingHorizontal: spacing.md },
  addBelow: { alignItems: 'flex-start', marginBottom: spacing.sm },
  white: { color: colors.surface },
  search: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.md,
    borderRadius: sizes.panelRadius, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.surface },
  searchInput: { flex: 1, minHeight: sizes.touch, color: colors.ink, fontSize: sizes.body, paddingRight: spacing.sm },
  malayalam: { fontFamily: 'Malayalam' },
  controls: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.xs, marginVertical: spacing.md },
  controlsStacked: { flexDirection: 'column', alignItems: 'flex-start' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, flexShrink: 1 },
  pill: { minHeight: sizes.touch, justifyContent: 'center', borderWidth: 1, borderColor: colors.divider,
    backgroundColor: colors.surface, borderRadius: spacing.xl },
  filter: { paddingHorizontal: 7 },
  selected: { backgroundColor: colors.navigationActive, borderColor: colors.navigationActive },
  sort: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 72,
    borderWidth: 1, borderColor: colors.softBorder, borderRadius: sizes.panelRadius, backgroundColor: colors.surface },
  iconTile: { width: 48, height: 48, borderRadius: sizes.panelRadius, backgroundColor: colors.selected,
    justifyContent: 'center', alignItems: 'center' },
  detail: { color: colors.navigationInk },
  muted: { color: colors.muted },
  form: { borderRadius: sizes.panelRadius, borderWidth: 1, borderColor: colors.softBorder, backgroundColor: colors.surface,
    padding: spacing.lg, gap: spacing.lg },
  field: { gap: spacing.xs },
  required: { color: colors.error },
  outlined: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.sm,
    borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.canvas, borderRadius: sizes.radius },
  input: { flex: 1, minHeight: sizes.touch, color: colors.ink, fontSize: sizes.body },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  status: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.softBorder, paddingTop: spacing.sm },
  pressed: { opacity: 0.7 },
});
