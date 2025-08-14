import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function LoadingScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="chatbubbles" size={64} color="#007AFF" />
        <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />
        <Text style={styles.text}>Loading...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginTop: 24,
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    color: '#8E8E93',
  },
});