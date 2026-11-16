import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { changeRegister, useRegister } from '../src/data/store';
import { Row, Screen, showError, useWords } from '../src/components/ui';
export default function Manage() {
  const state = useRegister(); const t = useWords();
  return <Screen title={t('Manage', 'ക്രമീകരണം')} tabs="manage"><View>
    <Row title={t('Reports', 'റിപ്പോർട്ടുകൾ')} onPress={() => router.push('/reports')} />
    <Row title={t('Recent activity', 'സമീപകാല പ്രവർത്തനങ്ങൾ')} onPress={() => router.push('/activity')} />
    <Row title={t('Periodicals', 'പത്രങ്ങൾ')} onPress={() => router.push({ pathname: '/catalog', params: { kind: 'periodicals' } })} />
    <Row title={t('Delivery boys', 'വിതരണക്കാർ')} onPress={() => router.push({ pathname: '/catalog', params: { kind: 'boys' } })} />
    <Row title={t('Routes', 'റൂട്ടുകൾ')} onPress={() => router.push({ pathname: '/catalog', params: { kind: 'routes' } })} />
    <Row title={t('Import households', 'വീടുകൾ ഇറക്കുമതി ചെയ്യുക')} onPress={() => router.push('/import')} />
    <Row title={t('Backups', 'ബാക്കപ്പുകൾ')} onPress={() => router.push('/backups')} />
    <Row title={t('Language', 'ഭാഷ')} right={state.language === 'en' ? 'English' : 'മലയാളം'} onPress={() => changeRegister(d => { d.language = d.language === 'en' ? 'ml' : 'en'; }).catch(showError)} />
  </View></Screen>;
}
