import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface User {
  id: string;
  nickname: string;
  display_name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('access_token');
      const storedUser = await AsyncStorage.getItem('user_data');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['access_token', 'user_data']);
      setUser(null);
      setToken(null);
      router.replace('/');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const refreshUser = async () => {
    await loadStoredAuth();
  };

  return (
    <AuthContext.Provider value={{ user, token, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};