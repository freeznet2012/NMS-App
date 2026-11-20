import React, { useRef, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Button, ErrorText, Field, Icon, IconButton, Label, Screen, useWords } from '../components/ui';
import { changeRegister, newId, useRegister } from '../data/store';
import { colors, sizes, spacing } from '../theme';

type CatalogKind = 'routes' | 'boys';

function useCatalogLabels(kind: CatalogKind) {
  const t = useWords();
  return kind === 'routes' ? {
    title: t('Routes', 'റൂട്ടുകൾ'),
    add: t('Add route', 'റൂട്ട് ചേർക്കുക'),
    edit: t('Edit route', 'റൂട്ട് തിരുത്തുക'),
    search: t('Search routes', 'റൂട്ടുകൾ തിരയുക'),
    name: t('Route name', 'റൂട്ടിന്റെ പേര്'),
    empty: t('No routes yet.', 'റൂട്ടുകളൊന്നും ചേർത്തിട്ടില്ല.'),
    missing: t('Route not found.', 'റൂട്ട് കണ്ടെത്തിയില്ല.'),
  } : {
    title: t('Delivery boys', 'വിതരണക്കാർ'),
    add: t('Add delivery boy', 'വിതരണക്കാരനെ ചേർക്കുക'),
    edit: t('Edit delivery boy', 'വിതരണക്കാരനെ തിരുത്തുക'),
    search: t('Search delivery boys', 'വിതരണക്കാരെ തിരയുക'),
    name: t('Delivery boy name', 'വിതരണക്കാരന്റെ പേര്'),
    empty: t('No delivery boys yet.', 'വിതരണക്കാരെ ഇതുവരെ ചേർത്തിട്ടില്ല.'),
    missing: t('Delivery boy not found.', 'വിതരണക്കാരനെ കണ്ടെത്തിയില്ല.'),
  };
}

function searchText(value: string) {
  return value.trim().normalize('NFC').toLocaleLowerCase();
}

export function NamedCatalogScreen({ kind }: { kind: CatalogKind }) {
  const state = useRegister();
  const t = useWords();
  const labels = useCatalogLabels(kind);
  const [query, setQuery] = useState('');
  const { width, fontScale } = useWindowDimensions();
  const compact = width / Math.max(fontScale, 1) < (kind === 'boys' ? 390 : 335) ||
    (kind === 'boys' && state.language === 'ml');
  const match = searchText(query);
  const records = state[kind].filter(record => searchText(record.name).includes(match));
  const openEditor = (id?: string) => {
    Keyboard.dismiss();
    router.push({ pathname: '/catalog-entry', params: id ? { kind, id } : { kind } });
  };
  const addAction = <Pressable accessibilityRole="button" onPress={() => openEditor()}
    style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
    <Icon name="add" size={22} color={colors.surface} />
    <Label bold style={styles.addLabel}>{labels.add}</Label>
  </Pressable>;

  return <Screen title={labels.title} back scroll={false} right={compact ? undefined : addAction}>
    {compact && <View style={styles.addBelow}>{addAction}</View>}
    <View style={styles.search}>
      <Icon name="search" color={colors.muted} />
      <TextInput accessibilityLabel={labels.search} placeholder={labels.search} placeholderTextColor={colors.muted}
        value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search"
        style={[styles.searchInput, state.language === 'ml' && styles.malayalam]} />
      {!!query && <IconButton name="clear" label={t('Clear search', 'തിരച്ചിൽ മായ്ക്കുക')} onPress={() => setQuery('')} />}
    </View>
    <FlatList data={records} keyExtractor={record => record.id} keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Label style={styles.muted}>{match ?
        t('No matches found.', 'പൊരുത്തപ്പെടുന്ന പേരുകളില്ല.') : labels.empty}</Label>}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.name}
        onPress={() => openEditor(item.id)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.iconTile}>
          <MaterialCommunityIcons name={kind === 'routes' ? 'map-marker-outline' : 'moped'} size={28} color={colors.navigationActive} />
        </View>
        <Label bold variant="headline" style={styles.name}>{item.name}</Label>
        <Icon name="chevron-right" size={22} />
      </Pressable>} />
  </Screen>;
}

export function NamedCatalogEditor({ kind, id }: { kind: CatalogKind; id?: string }) {
  const state = useRegister();
  const t = useWords();
  const labels = useCatalogLabels(kind);
  const existing = state[kind].find(record => record.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);

  async function save() {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError('');
    Keyboard.dismiss();
    try {
      const label = name.trim();
      if (!label) throw new Error(t('Enter a name', 'പേര് നൽകുക'));
      await changeRegister(draft => {
        const records = draft[kind];
        if (records.some(record => record.id !== id && record.name.toLocaleLowerCase() === label.toLocaleLowerCase())) {
          throw new Error(t('That name already exists', 'ഈ പേര് നിലവിലുണ്ട്'));
        }
        if (id) {
          const record = records.find(entry => entry.id === id);
          if (!record) throw new Error(labels.missing);
          record.name = label;
        } else {
          records.push({ id: newId(), name: label });
        }
      }, { action: (id ? 'Updated ' : 'Added ') + kind, name: label });
      router.back();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const title = id ? labels.edit : labels.add;
  if (id && !existing) return <Screen title={title} back><Label>{labels.missing}</Label></Screen>;

  return <Screen title={title} back footer={<Button title={t('Save', 'സൂക്ഷിക്കുക')} onPress={save} busy={busy} />}>
    <View style={styles.form}>
      <Field label={labels.name} value={name} onChangeText={setName} maxLength={200} autoCapitalize="words"
        returnKeyType="done" style={styles.formInput} />
      <ErrorText message={error} />
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  add: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, borderRadius: sizes.panelRadius, backgroundColor: colors.navigationActive, paddingHorizontal: spacing.md },
  addBelow: { alignItems: 'flex-start', marginBottom: spacing.sm },
  addLabel: { color: colors.surface, flexShrink: 1 },
  search: { minHeight: sizes.touch, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.md,
    borderRadius: sizes.panelRadius, borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.canvas },
  searchInput: { flex: 1, minHeight: sizes.touch, color: colors.ink, fontSize: sizes.body, paddingRight: spacing.sm },
  malayalam: { fontFamily: 'Malayalam' },
  list: { gap: spacing.sm, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.softBorder, borderRadius: sizes.panelRadius, backgroundColor: colors.surface },
  iconTile: { width: 48, height: 48, borderRadius: sizes.panelRadius, backgroundColor: colors.selected,
    alignItems: 'center', justifyContent: 'center' },
  name: { flex: 1 },
  muted: { color: colors.muted },
  form: { borderWidth: 1, borderColor: colors.softBorder, borderRadius: sizes.panelRadius,
    padding: spacing.lg, backgroundColor: colors.surface, gap: spacing.sm },
  formInput: { borderWidth: 1, borderColor: colors.divider, borderRadius: sizes.radius,
    backgroundColor: colors.canvas, paddingHorizontal: spacing.md },
  pressed: { opacity: 0.7 },
});
