import React, { useMemo, useState } from 'react';
import { FlatList, Keyboard, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Choice, Icon, IconButton, Label, Screen, useWords } from '../components/ui';
import { CustomerAvatar } from '../components/customer-avatar';
import { useRegister } from '../data/store';
import { currentProfile } from '../domain/model';
import { colors, identityColor, sizes, spacing } from '../theme';

type Filter = 'route' | 'boy';

function searchText(value: string) {
  return value.normalize('NFC').toLocaleLowerCase();
}

export function CustomersScreen({ onSelect }: { onSelect: (id: string) => void }) {
  const { households, routes, boys, language } = useRegister();
  const t = useWords();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width / Math.max(fontScale, 1) < 340;
  const [query, setQuery] = useState('');
  const [routeId, setRouteId] = useState('');
  const [boyId, setBoyId] = useState('');
  const [filter, setFilter] = useState<Filter>();
  const match = searchText(query.trim());

  const profiles = useMemo(() => households.map(household => {
    const profile = currentProfile(household);
    return { id: household.id, profile, searchName: searchText(profile.name) };
  }), [households]);
  const rows = profiles.filter(({ profile, searchName }) =>
    (!routeId || profile.routeId === routeId) &&
    (!boyId || profile.boyId === boyId) &&
    searchName.includes(match)
  );
  const routeNames = useMemo(() => new Map(routes.map(route => [route.id, route.name])), [routes]);
  const boyNames = useMemo(() => new Map(boys.map(boy => [boy.id, boy.name])), [boys]);
  const allRoutes = t('All Routes', 'എല്ലാ റൂട്ടുകളും');
  const allBoys = t('All Delivery Boys', 'എല്ലാ വിതരണക്കാരും');
  const searchLabel = t('Search by name or nickname', 'പേരോ വിളിപ്പേരോ തിരയുക');
  const searchHint = stacked ? t('Search customers', 'പേര് തിരയുക') : searchLabel;
  const count = rows.length === 1 ? t('1 customer', '1 ഉപഭോക്താവ്') : t(rows.length + ' customers', rows.length + ' ഉപഭോക്താക്കൾ');

  function showFilter(kind: Filter) {
    Keyboard.dismiss();
    setFilter(kind);
  }

  return <Screen tabs="customers" canvas scroll={false}>
    <FlatList
      data={rows}
      keyExtractor={item => item.id}
      keyboardShouldPersistTaps="always"
      contentContainerStyle={styles.list}
      ListHeaderComponent={<View style={styles.header}>
        <View style={styles.heading}>
          <Label variant="pageTitle" bold accessibilityRole="header">{t('Customers', 'ഉപഭോക്താക്കൾ')}</Label>
          <Label style={styles.muted}>{t('Find and manage customers', 'ഉപഭോക്താക്കളെ കണ്ടെത്തുകയും ക്രമീകരിക്കുകയും ചെയ്യുക')}</Label>
        </View>
        <View style={styles.search}>
          <Icon name="search" />
          <TextInput
            accessibilityLabel={searchLabel}
            placeholder={searchHint}
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={[styles.searchInput, language === 'ml' && styles.malayalamInput]}
          />
          {query.length > 0 && <IconButton name="close" label={t('Clear search', 'തിരച്ചിൽ മായ്ക്കുക')} onPress={() => setQuery('')} />}
        </View>
        <View style={[styles.filters, stacked && styles.stackedFilters]}>
          <Pressable onPress={() => showFilter('route')} accessibilityRole="button"
            accessibilityLabel={t('Route filter', 'റൂട്ട് ഫിൽട്ടർ') + ', ' + (routeNames.get(routeId) ?? allRoutes)}
            style={({ pressed }) => [styles.filter, !!routeId && styles.selectedFilter, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="road-variant" color={colors.blue} size={sizes.icon} />
            <Label bold variant="secondary" style={styles.filterText}>{routeNames.get(routeId) ?? allRoutes}</Label>
            <Icon name="arrow-drop-down" size={20} />
          </Pressable>
          <Pressable onPress={() => showFilter('boy')} accessibilityRole="button"
            accessibilityLabel={t('Delivery boy filter', 'വിതരണക്കാരന്റെ ഫിൽട്ടർ') + ', ' + (boyNames.get(boyId) ?? allBoys)}
            style={({ pressed }) => [styles.filter, !!boyId && styles.selectedFilter, pressed && styles.pressed]}>
            <Icon name="directions-bike" color={colors.blue} />
            <Label bold variant="secondary" style={styles.filterText}>{boyNames.get(boyId) ?? allBoys}</Label>
            <Icon name="arrow-drop-down" size={20} />
          </Pressable>
        </View>
        <Label variant="secondary" accessibilityLiveRegion="polite" style={styles.count}>{count}</Label>
      </View>}
      ListEmptyComponent={<Label style={styles.empty}>{households.length
        ? t('No customers match your search and filters.', 'തിരച്ചിലിനും ഫിൽട്ടറുകൾക്കും യോജിക്കുന്ന ഉപഭോക്താക്കളില്ല.')
        : t('No customers yet.', 'ഇതുവരെ ഉപഭോക്താക്കളില്ല.')}</Label>}
      renderItem={({ item: { id, profile } }) => {
        const boyColor = identityColor(profile.boyId);
        const route = routeNames.get(profile.routeId) ?? t('No route', 'റൂട്ട് ഇല്ല');
        const stop = t('Stop', 'സ്ഥാനം') + '\u00a0' + profile.position;
        const boy = boyNames.get(profile.boyId) ?? t('No delivery boy', 'വിതരണക്കാരനില്ല');
        return <Pressable accessibilityRole="button" accessibilityLabel={[profile.name, route, stop, boy].join(', ')}
          onPress={() => { Keyboard.dismiss(); onSelect(id); }}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <CustomerAvatar id={id} name={profile.name} />
          <View style={styles.customer}>
            <Label variant="headline" bold>{profile.name}</Label>
            <View style={[styles.metadata, stacked && styles.stackedMetadata]}>
              <View style={styles.metaGroup}>
                <MaterialCommunityIcons name="road-variant" color={colors.ink} size={18} />
                <Label variant="secondary" style={styles.metaText}>{route} · {stop}</Label>
              </View>
              <View style={[styles.metaGroup, !stacked && styles.boyMeta]}>
                <Icon name="directions-bike" color={boyColor.ink} size={18} />
                <Label variant="secondary" style={styles.metaText}>{boy}</Label>
              </View>
            </View>
          </View>
          <Icon name="chevron-right" size={22} />
        </Pressable>;
      }}
    />
    {filter && <Choice
      title={filter === 'route' ? t('Filter by route', 'റൂട്ട് അനുസരിച്ച് ഫിൽട്ടർ ചെയ്യുക') : t('Filter by delivery boy', 'വിതരണക്കാരൻ അനുസരിച്ച് ഫിൽട്ടർ ചെയ്യുക')}
      options={[
        { value: '', label: filter === 'route' ? allRoutes : allBoys },
        ...(filter === 'route' ? routes : boys).map(({ id, name }) => ({ value: id, label: name })),
      ]}
      onChoose={filter === 'route' ? setRouteId : setBoyId}
      onDismiss={() => setFilter(undefined)}
    />}
  </Screen>;
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.xl },
  header: { gap: spacing.md, paddingBottom: spacing.sm },
  heading: { paddingHorizontal: spacing.xs, marginBottom: spacing.sm, gap: spacing.xs },
  muted: { color: colors.muted },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: sizes.touch,
    backgroundColor: colors.panel, borderRadius: spacing.xl, paddingLeft: spacing.lg,
  },
  searchInput: {
    flex: 1, minHeight: sizes.touch, paddingVertical: spacing.sm,
    paddingRight: spacing.sm, fontSize: sizes.body, color: colors.ink,
  },
  malayalamInput: { fontFamily: 'Malayalam' },
  filters: { flexDirection: 'row', gap: spacing.sm },
  stackedFilters: { flexDirection: 'column' },
  filter: {
    flexGrow: 1, flexShrink: 1, flexBasis: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    minHeight: sizes.touch, borderRadius: spacing.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    backgroundColor: colors.panel,
  },
  selectedFilter: { backgroundColor: colors.selected, borderWidth: 1, borderColor: colors.blue },
  filterText: { flex: 1 },
  count: { paddingHorizontal: spacing.xs, marginTop: spacing.xs },
  empty: { paddingHorizontal: spacing.xs, color: colors.muted },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 64, padding: spacing.sm,
    paddingLeft: spacing.md, backgroundColor: colors.surface, borderWidth: 1,
    borderColor: colors.softBorder, borderRadius: sizes.panelRadius,
  },
  customer: { flex: 1, gap: spacing.xs },
  metadata: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  stackedMetadata: { flexDirection: 'column', gap: spacing.xs },
  metaGroup: { flexDirection: 'row', flexShrink: 1, alignItems: 'center', gap: spacing.xs },
  metaText: { flexShrink: 1 },
  boyMeta: { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: colors.divider, paddingLeft: spacing.sm },
  pressed: { opacity: 0.65 },
});
