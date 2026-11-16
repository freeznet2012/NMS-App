import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, NotoSansMalayalam_400Regular, NotoSansMalayalam_700Bold } from '@expo-google-fonts/noto-sans-malayalam';
import { ActivityIndicator, Text, View } from 'react-native';
import { RegisterProvider } from '../src/data/store';
import { BackupLifecycle } from '../src/data/backup-schedule';

export default function Layout() {
  const [loaded, error] = useFonts({ Malayalam: NotoSansMalayalam_400Regular, MalayalamBold: NotoSansMalayalam_700Bold });
  if (error) return <View><Text>{error.message}</Text></View>;
  if (!loaded) return <ActivityIndicator accessibilityLabel="Loading fonts" />;
  return <RegisterProvider><BackupLifecycle /><StatusBar style="dark" /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'white' } }} /></RegisterProvider>;
}
