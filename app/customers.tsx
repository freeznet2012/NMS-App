import React, { useState } from 'react';
import { FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useRegister } from '../src/data/store';
import { currentProfile } from '../src/domain/model';
import { Field, Label, Row, Screen, useWords } from '../src/components/ui';
export default function Customers() {
  const state = useRegister(); const t = useWords(); const [query, setQuery] = useState('');
  const { images } = useLocalSearchParams<{ images?: string }>();
  const rows = state.households.map(h => ({ id: h.id, profile: currentProfile(h) })).filter(r => r.profile.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <Screen title={t('Find customer', 'ഉപഭോക്താവിനെ കണ്ടെത്തുക')} back={!!images} tabs={images ? undefined : 'customers'} scroll={false}>
    <Field label={t('Name or nickname', 'പേര് അല്ലെങ്കിൽ വിളിപ്പേര്')} value={query} onChangeText={setQuery} />
    <FlatList data={rows} keyExtractor={r => r.id} keyboardShouldPersistTaps="handled" ListEmptyComponent={<Label>{t('No matching households', 'വീടുകൾ കണ്ടെത്തിയില്ല')}</Label>}
      renderItem={({ item }) => <Row title={item.profile.name} detail={(state.routes.find(r => r.id === item.profile.routeId)?.name ?? '') + ' · ' + t('Stop', 'സ്ഥാനം') + ' ' + item.profile.position}
        onPress={() => router.push({ pathname: images ? '/payment' : '/customer', params: { id: item.id, ...(images ? { images } : {}) } })} />} />
  </Screen>;
}
