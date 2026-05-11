/**
 * SOMAKID AI - Authentication Hook
 * React hook for accessing authentication state and actions.
 * Provides computed values and simplifies component integration.
 */

import { useCallback, useMemo } from 'react';
import { useAuthStore } from '../store/auth.store';
import type { Language, ChildProfile } from '../types/api.types';

// =============================================================================
// Hook
// =============================================================================

export function useAuth() {
  const store = useAuthStore();

  // --- Computed Values ---

  const hasChildren = useMemo(
    () => (store.user?.children?.length ?? 0) > 0,
    [store.user?.children]
  );

  const childrenCount = useMemo(
    () => store.user?.children?.length ?? 0,
    [store.user?.children]
  );

  const children = useMemo(
    () => store.user?.children ?? [],
    [store.user?.children]
  );

  const childName = useMemo(
    () => store.activeChild?.firstName ?? 'Explorer',
    [store.activeChild]
  );

  const childLevel = useMemo(
    () => store.activeChild?.level ?? 1,
    [store.activeChild]
  );

  const childPoints = useMemo(
    () => store.activeChild?.totalPoints ?? 0,
    [store.activeChild]
  );

  const childTitle = useMemo(
    () => store.activeChild?.title ?? 'Junior Explorer',
    [store.activeChild]
  );

  // --- Callbacks ---

  const login = useCallback(
    async (email: string, password: string) => {
      await store.login({ email, password });
    },
    [store.login]
  );

  const register = useCallback(
    async (params: {
      lastName: string;
      firstName: string;
      email: string;
      password: string;
      passwordConfirmation: string;
      language?: Language;
    }) => {
      await store.register(params);
    },
    [store.register]
  );

  const loginAsChild = useCallback(
    async (childId: string, pin: string) => {
      await store.loginChild({ childId, pin });
    },
    [store.loginChild]
  );

  const logout = useCallback(async () => {
    await store.logout();
  }, [store.logout]);

  const switchChild = useCallback(
    (child: ChildProfile) => {
      store.setActiveChild(child);
    },
    [store.setActiveChild]
  );

  const refreshProfile = useCallback(async () => {
    await store.loadProfile();
  }, [store.loadProfile]);

  // --- Return ---

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    activeChild: store.activeChild,
    error: store.error,
    hasChildren,
    childrenCount,
    children,
    childName,
    childLevel,
    childPoints,
    childTitle,
    login,
    register,
    loginAsChild,
    logout,
    switchChild,
    refreshProfile,
    createChild: store.createChild,
    clearError: store.clearError,
  };
}