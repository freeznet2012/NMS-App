import React, { useState } from 'react';
import { FlatList, Keyboard } from 'react-native';
import { Field, Label, Row, Screen, useWords } from '../components/ui';
import { useRegister } from '../data/store';
import { currentProfile } from '../domain/model';

export function CustomerPicker({ forPayment = false, onSelect }: {
  forPayment?: boolean;
  onSelect: (id: string) => void;
}) {
  const state = useRegister();
  const t = useWords();
  const [query, setQuery] = useState('');
  const match = query.trim().toLocaleLowerCase();
  const rows = state.households.map(h => ({ id: h.id, profile: currentProfile(h) }))
    .filter(row => row.profile.name.toLocaleLowerCase().includes(match));

  return <Screen title={t('Find customer', 'ഉപഭോക്താവിനെ കണ്ടെത്തുക')} back={forPayment}
    tabs={forPayment ? undefined : 'customers'} scroll={false}>
    {forPayment && <Label>{t('Choose the customer for this payment image.', 'ഈ പണമടവ് ചിത്രത്തിനുള്ള ഉപഭോക്താവിനെ തിരഞ്ഞെടുക്കുക.')}</Label>}
    <Field label={t('Name or nickname', 'പേര് അല്ലെങ്കിൽ വിളിപ്പേര്')} value={query} onChangeText={setQuery} />
    <FlatList data={rows} keyExtractor={row => row.id} keyboardShouldPersistTaps="always"
      ListEmptyComponent={<Label>{t('No matching households', 'വീടുകൾ കണ്ടെത്തിയില്ല')}</Label>}
      renderItem={({ item }) => {
        const routeName = state.routes.find(route => route.id === item.profile.routeId)?.name ?? '';
        return <Row title={item.profile.name}
          detail={routeName + ' · ' + t('Stop', 'സ്ഥാനം') + ' ' + item.profile.position}
          onPress={() => {
            Keyboard.dismiss();
            onSelect(item.id);
          }} />;
      }} />
  </Screen>;
}
