/**
 * SOMAKID AI - Authentication Store
 * Zustand store for managing authentication state, user profile, and active child.
 * Currently works without backend - creates a mock session for development.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  UserProfile,
  ChildProfile,
  Language,
  LoginRequest,
  ChildLoginRequest,
} from '../types/api.types';
import { extractErrorMessage } from '../services/api/client';

// =============================================================================
// Mock Data for Development (Remove when backend is ready)
// =============================================================================

const MOCK_CHILD: ChildProfile = {
  id: 'child_001',
  firstName: 'Explorer',
  age: 8,
  avatar: '🦁',
  language: 'fr',
  totalPoints: 150,
  level: 2,
  title: 'Ecology Apprentice',
  badges: [
    {
      id: 'first_step',
      name: 'First Step',
      description: 'You started your SOMAKID adventure!',
      emoji: '🌱',
      color: '#38A169',
    },
  ],
  speciesDiscovered: ['Baobab', 'African Elephant'],
  quizzesCompleted: 5,
  lastActivity: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

const MOCK_USER: UserProfile = {
  id: 'user_001',
  lastName: 'Demo',
  firstName: 'Parent',
  email: 'demo@somakid.ai',
  language: 'fr',
  country: 'CD',
  role: 'parent',
  children: [MOCK_CHILD],
};

// =============================================================================
// State Interface
// =============================================================================

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeChild: ChildProfile | null;
  error: string | null;

  login: (request: LoginRequest) => Promise<void>;
  register: (request: {
    lastName: string;
    firstName: string;
    email: string;
    password: string;
    passwordConfirmation: string;
    language?: Language;
  }) => Promise<void>;
  loginChild: (request: ChildLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
  setActiveChild: (child: ChildProfile | null) => void;
  createChild: (request: {
    firstName: string;
    age: number;
    avatar: string;
    pinCode: string;
    language: Language;
  }) => Promise<ChildProfile>;
  refreshChildren: () => Promise<void>;
  clearError: () => void;
  initialize: () => Promise<void>;
  skipAuth: () => void;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  activeChild: null,
  error: null,

  initialize: async () => {
    try {
      const token = await AsyncStorage.getItem('somakid_auth_token');
      if (token) {
        // In development, auto-login with mock data
        set({
          user: MOCK_USER,
          token: 'mock_token_dev',
          isAuthenticated: true,
          activeChild: MOCK_CHILD,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  skipAuth: () => {
    set({
      user: MOCK_USER,
      token: 'mock_token_dev',
      isAuthenticated: true,
      activeChild: MOCK_CHILD,
      isLoading: false,
    });
    AsyncStorage.setItem('somakid_auth_token', 'mock_token_dev');
  },

  login: async () => {
    set({ isLoading: true, error: null });
    try {
      // Mock login for development
      await new Promise((resolve) => setTimeout(resolve, 500));
      set({
        user: MOCK_USER,
        token: 'mock_token_dev',
        isAuthenticated: true,
        activeChild: MOCK_CHILD,
        isLoading: false,
      });
      await AsyncStorage.setItem('somakid_auth_token', 'mock_token_dev');
    } catch (error) {
      set({ isLoading: false, error: extractErrorMessage(error) });
      throw error;
    }
  },

  register: async () => {
    set({ isLoading: true, error: null });
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      set({
        user: MOCK_USER,
        token: 'mock_token_dev',
        isAuthenticated: true,
        isLoading: false,
      });
      await AsyncStorage.setItem('somakid_auth_token', 'mock_token_dev');
    } catch (error) {
      set({ isLoading: false, error: extractErrorMessage(error) });
      throw error;
    }
  },

  loginChild: async () => {
    set({ isLoading: true, error: null });
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      set({
        token: 'mock_token_dev',
        isAuthenticated: true,
        activeChild: MOCK_CHILD,
        isLoading: false,
      });
      await AsyncStorage.setItem('somakid_auth_token', 'mock_token_dev');
    } catch (error) {
      set({ isLoading: false, error: extractErrorMessage(error) });
      throw error;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('somakid_auth_token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      activeChild: null,
      error: null,
    });
  },

  loadProfile: async () => {
    set({ user: MOCK_USER, activeChild: get().activeChild || MOCK_CHILD });
  },

  setActiveChild: (child) => set({ activeChild: child }),

  createChild: async (request) => {
    const newChild: ChildProfile = {
      id: `child_${Date.now()}`,
      firstName: request.firstName,
      age: request.age,
      avatar: request.avatar,
      language: request.language,
      totalPoints: 0,
      level: 1,
      title: 'Junior Explorer',
      badges: [],
      speciesDiscovered: [],
      quizzesCompleted: 0,
      createdAt: new Date().toISOString(),
    };
    const user = get().user;
    if (user) {
      set({
        user: { ...user, children: [...(user.children || []), newChild] },
        activeChild: get().activeChild || newChild,
      });
    }
    return newChild;
  },

  refreshChildren: async () => {},

  clearError: () => set({ error: null }),
}));