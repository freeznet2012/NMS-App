import React from 'react';
import { FlatList } from 'react-native';
import { router } from 'expo-router';
import { useRegister } from '../src/data/store';
import { money } from '../src/domain/model';
import { Label, Row, Screen, useWords } from '../src/components/ui';
export default function ActivityScreen() {
  const state = useRegister(); const t = useWords();
  return <Screen title={t('Recent activity', 'സമീപകാല പ്രവർത്തനങ്ങൾ')} back scroll={false}>
    <FlatList data={[...state.activity].reverse()} keyExtractor={item => item.id} ListEmptyComponent={<Label>{t('No changes recorded yet', 'മാറ്റങ്ങൾ രേഖപ്പെടുത്തിയിട്ടില്ല')}</Label>}
      renderItem={({ item }) => <Row title={[item.name, item.action].filter(Boolean).join(' · ')}
        detail={[new Date(item.at).toLocaleString(), item.route, item.amount === undefined ? '' : money(item.amount)].filter(Boolean).join(' · ')}
        onPress={item.customerId && state.households.some(h => h.id === item.customerId) ? () => router.push({ pathname: '/customer', params: { id: item.customerId } }) : undefined} />} />
  </Screen>;
}
