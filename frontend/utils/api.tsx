import AsyncStorage from '@react-native-async-storage/async-storage';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${BACKEND_URL}/api${endpoint}`, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    let data;
    try {
      data = await response.json();
    } catch (error) {
      // Response might not be JSON
      data = await response.text();
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data?.detail || data?.message || `HTTP ${response.status}`,
        data
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    console.error('API request failed:', error);
    throw new ApiError(0, 'Network request failed', error);
  }
};