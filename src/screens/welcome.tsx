import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { changeRegister, useRegister } from '../data/store';
import { Button, Icon, Label, Screen, showError, useWords } from '../components/ui';
import { colors as c, spacing as s, sizes } from '../theme';

export function Welcome() {
  const state = useRegister();
  const t = useWords();
  if (state.started) return <Redirect href="/routes" />;
  return <Screen footer={<><Button title={t('Start a register', 'രജിസ്റ്റർ തുടങ്ങുക')} onPress={() => router.push('/import')} />
    <Button title={t('Restore backup', 'ബാക്കപ്പ് പുനഃസ്ഥാപിക്കുക')} secondary onPress={() => router.push('/backups')} /></>}>
    <View style={{ paddingTop: s.xl, paddingBottom: s.xl }}><Label variant="welcome" bold>NMS</Label>
      <Label variant="welcome" bold>{t('Route register', 'റൂട്ട് രജിസ്റ്റർ')}</Label></View>
    {(['en', 'ml'] as const).map(language => <Pressable key={language} accessibilityRole="radio"
      accessibilityState={{ checked: state.language === language }} onPress={() => changeRegister(d => { d.language = language; }).catch(showError)}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: s.lg, paddingHorizontal: s.sm, minHeight: 56,
        backgroundColor: state.language === language ? c.selected : c.surface, borderRadius: sizes.radius, opacity: pressed ? 0.7 : 1 })}>
      <Icon name={state.language === language ? 'radio-button-checked' : 'radio-button-unchecked'} color={state.language === language ? c.blue : c.muted} size={32} />
      <Label variant="title" bold>{language === 'en' ? 'English' : 'മലയാളം'}</Label>
    </Pressable>)}
    <View style={{ flex: 1, minHeight: 180, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={require('../../assets/newspaper.png')} accessible={false} style={{ width: '70%', height: 180, resizeMode: 'contain' }} />
    </View>
  </Screen>;
}
