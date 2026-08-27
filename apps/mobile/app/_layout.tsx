import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MobileAuthProvider } from '../src/auth/authContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <MobileAuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(workspace)" />
        </Stack>
      </MobileAuthProvider>
    </SafeAreaProvider>
  );
}
