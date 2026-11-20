import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts, NotoSansMalayalam_400Regular, NotoSansMalayalam_700Bold } from '@expo-google-fonts/noto-sans-malayalam';
import { AccessibilityInfo, ActivityIndicator, Text, View } from 'react-native';
import { RegisterProvider } from '../src/data/store';
import { BackupLifecycle } from '../src/data/backup-schedule';
import { colors } from '../src/theme';

const tabOptions = { animation: 'none', animationTypeForReplace: 'push' } as const;

export default function Layout() {
  const [loaded, error] = useFonts({ Malayalam: NotoSansMalayalam_400Regular, MalayalamBold: NotoSansMalayalam_700Bold });
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let useInitialValue = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => {
      useInitialValue = false;
      setReduceMotion(enabled);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      if (useInitialValue) setReduceMotion(enabled);
    }).catch(() => undefined);
    return () => {
      useInitialValue = false;
      subscription.remove();
    };
  }, []);

  if (error) return <View><Text>{error.message}</Text></View>;
  if (!loaded) return <ActivityIndicator accessibilityLabel="Loading fonts" />;
  return (
    <RegisterProvider>
      <BackupLifecycle />
      <StatusBar style="dark" />
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        animation: reduceMotion ? 'fade' : 'ios_from_right',
      }}>
        <Stack.Screen name="routes" options={tabOptions} />
        <Stack.Screen name="customers" options={tabOptions} />
        <Stack.Screen name="manage" options={tabOptions} />
        <Stack.Screen name="balance" options={{ animationTypeForReplace: 'push' }} />
      </Stack>
    </RegisterProvider>
  );
}
