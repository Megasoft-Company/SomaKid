/**
 * SOMAKID AI - Chat Hook
 * React hook for interacting with the SOMA AI tutor.
 */

import { useCallback, useRef, useEffect } from 'react';
import { useChatStore } from '../store/chat.store';
import type { Language } from '../types/api.types';

// =============================================================================
// Hook
// =============================================================================

export function useChat() {
  const store = useChatStore();
  const flatListRef = useRef<any>(null);

  // --- Initialize session on mount ---
  useEffect(() => {
    if (!store.sessionId || store.messages.length === 0) {
      store.initializeSession();
    }
  }, []);

  // --- Scroll to bottom when messages change ---
  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd?.({ animated: true });
      }, 100);
    }
  }, [store.messages]);

  // --- Callbacks ---

  /** Send a text message to SOMA */
  const send = useCallback(
    async (content: string, language: Language = 'fr') => {
      await store.sendMessage(content, language);
    },
    [store.sendMessage],
  );

  /**
   * Send an image to SOMA vision endpoint.
   * The response is displayed in chat AND read aloud via TTS,
   * exactly like a text message.
   */
  const sendImage = useCallback(
    async (imageUri: string, language: Language = 'fr', childAge: number = 8) => {
      await store.sendImage(imageUri, language, childAge);
    },
    [store.sendImage],
  );

  /** Reload conversation history */
  const refreshHistory = useCallback(async () => {
    await store.loadHistory();
  }, [store.loadHistory]);

  /** Start a new conversation */
  const newConversation = useCallback(() => {
    store.clearMessages();
  }, [store.clearMessages]);

  /** Quick question handler */
  const askQuickQuestion = useCallback(
    async (question: string, language: Language = 'fr') => {
      await store.sendMessage(question, language);
    },
    [store.sendMessage],
  );

  // --- Return ---

  return {
    // State
    messages: store.messages,
    sessionId: store.sessionId,
    isLoading: store.isLoading,
    isSending: store.isSending,
    isSpeaking: store.isSpeaking,
    error: store.error,

    // Refs
    flatListRef,

    // Actions
    send,
    sendImage,
    refreshHistory,
    newConversation,
    askQuickQuestion,
    clearError: store.clearError,
    stopSpeaking: store.stopSpeaking,
  };
}