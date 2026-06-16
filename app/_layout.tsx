import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { colors } from '../src/theme';
import { ProgressProvider } from '../src/context/ProgressContext';
import { SettingsProvider } from '../src/context/SettingsContext';
import XpToast from '../src/components/XpToast';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.black }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ProgressProvider>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.black },
                animation: 'fade',
              }}
            >
              <Stack.Screen name="index" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="word/[word]" options={{ animation: 'slide_from_right' }} />
              <Stack.Screen name="learn/[word]" options={{ animation: 'slide_from_bottom' }} />
            </Stack>
            <XpToast />
          </ProgressProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
