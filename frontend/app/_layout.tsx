import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider } from '../hooks/useAuth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
      </Stack>
    </AuthProvider>
  );
}