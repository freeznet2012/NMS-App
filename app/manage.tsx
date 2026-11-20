import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { changeRegister, useRegister } from '../src/data/store';
import { Choice, Icon, Label, RoadIcon, Screen, showError, useWords } from '../src/components/ui';
import { colors, sizes, spacing } from '../src/theme';

type Glyph = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type Action = {
  title: string;
  detail: string;
  icon: Glyph | 'route' | 'delivery';
  tone: keyof typeof iconTones;
  onPress: () => void;
  accessory?: React.ReactNode;
};

const iconTones = {
  violet: { surface: '#EEE7FF', ink: '#6641C5' },
  blue: { surface: '#E3EEFF', ink: colors.navigationActive },
  orange: { surface: '#FDEBDD', ink: '#A74A0B' },
  green: { surface: '#DCF5E6', ink: '#137A42' },
  teal: { surface: '#DCF5F5', ink: '#08777F' },
  pink: { surface: '#FCE4EE', ink: '#AC2358' },
};

export default function Manage() {
  const { language } = useRegister();
  const t = useWords();
  const [choosingLanguage, setChoosingLanguage] = useState(false);
  const currentLanguage = language === 'en' ? 'English' : 'മലയാളം';

  const sections: { title: string; icon: Glyph; actions: Action[] }[] = [
    {
      title: t('Operations', 'പ്രവർത്തനങ്ങൾ'),
      icon: 'chart-bar',
      actions: [
        {
          title: t('Reports', 'റിപ്പോർട്ടുകൾ'),
          detail: t('View and download business reports', 'റിപ്പോർട്ടുകൾ കാണുകയും ഡൗൺലോഡ് ചെയ്യുകയും ചെയ്യുക'),
          icon: 'signal', tone: 'violet', onPress: () => router.push('/reports'),
        },
        {
          title: t('Recent activity', 'സമീപകാല പ്രവർത്തനങ്ങൾ'),
          detail: t('Track latest updates and changes', 'പുതിയ രേഖകളും മാറ്റങ്ങളും കാണുക'),
          icon: 'clock-outline', tone: 'blue', onPress: () => router.push('/activity'),
        },
      ],
    },
    {
      title: t('Manage data', 'രേഖകൾ ക്രമീകരിക്കുക'),
      icon: 'layers-triple-outline',
      actions: [
        {
          title: t('Periodicals', 'പത്രങ്ങൾ'),
          detail: t('Manage newspapers and monthly prices', 'പത്രങ്ങളും മാസവിലയും ക്രമീകരിക്കുക'),
          icon: 'calendar-blank-outline', tone: 'orange',
          onPress: () => router.push({ pathname: '/catalog', params: { kind: 'periodicals' } }),
        },
        {
          title: t('Delivery boys', 'വിതരണക്കാർ'),
          detail: t('Add and manage delivery personnel', 'വിതരണക്കാരെ ചേർക്കുകയും ക്രമീകരിക്കുകയും ചെയ്യുക'),
          icon: 'delivery', tone: 'green',
          onPress: () => router.push({ pathname: '/catalog', params: { kind: 'boys' } }),
        },
        {
          title: t('Routes', 'റൂട്ടുകൾ'),
          detail: t('Create and manage delivery routes', 'വിതരണ റൂട്ടുകൾ ചേർക്കുകയും ക്രമീകരിക്കുകയും ചെയ്യുക'),
          icon: 'route', tone: 'blue',
          onPress: () => router.push({ pathname: '/catalog', params: { kind: 'routes' } }),
        },
        {
          title: t('Import households', 'വീടുകൾ ഇറക്കുമതി ചെയ്യുക'),
          detail: t('Add customers in bulk from a file', 'ഫയലിൽ നിന്ന് ഉപഭോക്താക്കളെ ഒരുമിച്ച് ചേർക്കുക'),
          icon: 'home-outline', tone: 'violet', onPress: () => router.push('/import'),
        },
      ],
    },
    {
      title: t('Settings & maintenance', 'ക്രമീകരണങ്ങളും പരിപാലനവും'),
      icon: 'cog-outline',
      actions: [
        {
          title: t('Backups', 'ബാക്കപ്പുകൾ'),
          detail: t('Create and restore data backups', 'ബാക്കപ്പ് എടുക്കുകയും പുനഃസ്ഥാപിക്കുകയും ചെയ്യുക'),
          icon: 'database-outline', tone: 'teal', onPress: () => router.push('/backups'),
        },
        {
          title: t('Language', 'ഭാഷ'),
          detail: t('App language', 'ആപ്പിന്റെ ഭാഷ'),
          icon: 'translate', tone: 'pink', onPress: () => setChoosingLanguage(true),
          accessory: <View style={styles.languagePill}>
            <Label variant="secondary" bold style={styles.languageText}>{currentLanguage}</Label>
            <Icon name="keyboard-arrow-down" size={18} color={colors.darkBlue} />
          </View>,
        },
      ],
    },
  ];

  return <Screen tabs="manage" canvas>
    <View style={styles.content}>
      <View style={styles.header}>
        <View pointerEvents="none" style={styles.headerCurve} />
        <Label variant="pageTitle" bold accessibilityRole="header">{t('Manage', 'ക്രമീകരണം')}</Label>
        <Label style={styles.description}>{t('Configure and run your operations', 'വിതരണ പ്രവർത്തനങ്ങൾ ക്രമീകരിക്കുകയും നടത്തുകയും ചെയ്യുക')}</Label>
      </View>
      {sections.map(section => <View key={section.icon} style={styles.section}>
        <View style={styles.sectionHeading}>
          <MaterialCommunityIcons name={section.icon} size={sizes.icon} color={colors.navigationActive} />
          <Label variant="headline" bold accessibilityRole="header" style={styles.sectionTitle}>{section.title}</Label>
        </View>
        <View style={styles.card}>
          {section.actions.map((action, index) => {
            const tone = iconTones[action.tone];
            return <Pressable key={action.icon} accessibilityRole="button" onPress={action.onPress}
              style={({ pressed }) => [styles.row, index > 0 && styles.rowBorder, pressed && styles.pressed]}>
              <View style={[styles.iconTile, { backgroundColor: tone.surface }]}>
                {action.icon === 'route' ? <RoadIcon color={tone.ink} /> :
                  action.icon === 'delivery' ? <Icon name="directions-bike" color={tone.ink} /> :
                    <MaterialCommunityIcons name={action.icon} size={sizes.icon} color={tone.ink} />}
              </View>
              <View style={styles.rowText}>
                <Label bold>{action.title}</Label>
                <Label variant="secondary" style={styles.description}>{action.detail}</Label>
              </View>
              {action.accessory}
              <Icon name="chevron-right" size={22} />
            </Pressable>;
          })}
        </View>
      </View>)}
    </View>
    {choosingLanguage && <Choice
      title={t('App language', 'ആപ്പിന്റെ ഭാഷ')}
      options={[{ value: 'en', label: 'English' }, { value: 'ml', label: 'മലയാളം' }]}
      onChoose={value => {
        if (value !== language && (value === 'en' || value === 'ml')) {
          void changeRegister(draft => { draft.language = value; }).catch(showError);
        }
      }}
      onDismiss={() => setChoosingLanguage(false)}
    />}
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.sm, gap: spacing.xl },
  header: { gap: spacing.xs, paddingHorizontal: spacing.xs },
  headerCurve: {
    position: 'absolute', width: 240, height: 240, top: -188, right: -50,
    borderWidth: 24, borderRadius: 120, borderColor: colors.selected, opacity: 0.65,
  },
  description: { color: colors.muted },
  section: { gap: spacing.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xs },
  sectionTitle: { flex: 1 },
  card: {
    borderRadius: sizes.panelRadius, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.softBorder,
    elevation: 2, shadowColor: colors.darkBlue, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56,
    paddingVertical: 6, paddingLeft: spacing.md, paddingRight: spacing.sm,
  },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.softBorder },
  pressed: { backgroundColor: colors.secondary },
  iconTile: { width: 42, height: 42, borderRadius: sizes.panelRadius, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  languagePill: {
    maxWidth: '40%', flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.xs, paddingLeft: spacing.sm, paddingRight: spacing.xs,
    backgroundColor: colors.panel, borderRadius: sizes.panelRadius,
  },
  languageText: { flexShrink: 1, color: colors.darkBlue },
});
