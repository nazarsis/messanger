import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    nickname: string;
    display_name: string;
    email: string;
  };
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nickname: '',
    email: '',
    password: '',
    displayName: '',
    phone: '',
  });

  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

  const handleAuth = async () => {
    if (loading) return;

    // Validation
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Email and password are required');
      return;
    }

    if (!isLogin && !formData.nickname) {
      Alert.alert('Error', 'Nickname is required for registration');
      return;
    }

    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const payload = isLogin
        ? {
            email: formData.email,
            password: formData.password,
          }
        : {
            nickname: formData.nickname,
            email: formData.email,
            password: formData.password,
            display_name: formData.displayName || formData.nickname,
            phone: formData.phone || null,
          };

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data: AuthResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      // Store auth data
      await AsyncStorage.setItem('access_token', data.access_token);
      await AsyncStorage.setItem('user_data', JSON.stringify(data.user));

      Alert.alert(
        'Success',
        isLogin ? 'Logged in successfully!' : 'Registration successful!',
        [{ text: 'OK', onPress: onAuthSuccess }]
      );
    } catch (error: any) {
      console.error('Auth error:', error);
      Alert.alert('Error', error.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      nickname: '',
      email: '',
      password: '',
      displayName: '',
      phone: '',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="chatbubbles" size={64} color="#007AFF" />
            </View>
            <Text style={styles.title}>Messenger</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Welcome back!' : 'Create your account'}
            </Text>
          </View>

          <View style={styles.form}>
            {!isLogin && (
              <>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#8E8E93" />
                  <TextInput
                    style={styles.input}
                    placeholder="Nickname"
                    placeholderTextColor="#8E8E93"
                    value={formData.nickname}
                    onChangeText={(text) =>
                      setFormData({ ...formData, nickname: text })
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#8E8E93" />
                  <TextInput
                    style={styles.input}
                    placeholder="Display Name (optional)"
                    placeholderTextColor="#8E8E93"
                    value={formData.displayName}
                    onChangeText={(text) =>
                      setFormData({ ...formData, displayName: text })
                    }
                    autoCorrect={false}
                  />
                </View>
              </>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#8E8E93" />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#8E8E93"
                value={formData.email}
                onChangeText={(text) =>
                  setFormData({ ...formData, email: text })
                }
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#8E8E93"
                value={formData.password}
                onChangeText={(text) =>
                  setFormData({ ...formData, password: text })
                }
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {!isLogin && (
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#8E8E93" />
                <TextInput
                  style={styles.input}
                  placeholder="Phone (optional)"
                  placeholderTextColor="#8E8E93"
                  value={formData.phone}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phone: text })
                  }
                  keyboardType="phone-pad"
                  autoCorrect={false}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.authButton, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
            >
              <Text style={styles.authButtonText}>
                {loading
                  ? 'Please wait...'
                  : isLogin
                  ? 'Login'
                  : 'Create Account'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.toggleButton} onPress={toggleAuthMode}>
              <Text style={styles.toggleText}>
                {isLogin
                  ? "Don't have an account? Sign up"
                  : 'Already have an account? Login'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
    marginLeft: 12,
  },
  authButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#2C2C2E',
  },
  authButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  toggleText: {
    color: '#007AFF',
    fontSize: 14,
  },
});