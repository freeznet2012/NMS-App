import React from 'react';
import { StyleSheet, View } from 'react-native';
import { identityColor } from '../theme';
import { Label } from './ui';

export function CustomerAvatar({ id, name }: { id: string; name: string }) {
  const tone = identityColor(id);
  const initial = name.trim().match(/^\S\p{Mark}*/u)?.[0].toLocaleUpperCase() ?? '?';
  return <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.avatar, { backgroundColor: tone.background }]}>
    <Label variant="title" bold maxFontSizeMultiplier={1.25} style={{ color: tone.ink }}>{initial}</Label>
  </View>;
}

const styles = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
