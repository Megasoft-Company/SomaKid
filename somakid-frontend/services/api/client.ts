import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiErrorResponse } from '../../types/api.types';

const AI_ENGINE_URL = process.env.EXPO_PUBLIC_AI_ENGINE_URL || 'https://somakid-api-121195486619.europe-west1.run.app';
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://somakid-api-121195486619.europe-west1.run.app';
const DEFAULT_TIMEOUT = 60000;
const AI_ENGINE_TIMEOUT = 120000;
const AUTH_TOKEN_KEY = 'somakid_auth_token';
const REFRESH_TOKEN_KEY = 'somakid_refresh_token';

const createBackendClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: `${BACKEND_URL}/api/v1`,
    timeout: DEFAULT_TIMEOUT,
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  });
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    (error: AxiosError) => Promise.reject(error)
  );
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<ApiErrorResponse>) => {
      if (error.response?.status === 401) await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY]);
      return Promise.reject(error);
    }
  );
  return client;
};

const createAIEngineClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: `${AI_ENGINE_URL}/api/v1`,
    timeout: AI_ENGINE_TIMEOUT,
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  });
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiErrorResponse>) => {
      if (__DEV__) {
        console.warn(
          `[AI Engine] ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
          error.response?.data?.message || error.message
        );
      }
      return Promise.reject(error);
    }
  );
  return client;
};

export const backendClient = createBackendClient();
export const aiEngineClient = createAIEngineClient();

export const storeAuthToken = async (token: string): Promise<void> => { await AsyncStorage.setItem(AUTH_TOKEN_KEY, token); };
export const getAuthToken = async (): Promise<string | null> => { return AsyncStorage.getItem(AUTH_TOKEN_KEY); };
export const clearAuthTokens = async (): Promise<void> => { await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY]); };
export const isAuthenticated = async (): Promise<boolean> => { const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY); return !!token; };

export const extractErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (error.code === 'ERR_NETWORK') return 'Cannot connect to server. Check your connection.';
    const apiError = error.response?.data as ApiErrorResponse | undefined;
    if (apiError?.message) return apiError.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred. Please try again.';
};

declare const __DEV__: boolean;