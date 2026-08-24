import { create } from 'zustand';
import { Platform } from 'react-native';
import type { Language, ChatMessage, ChatResponse } from '../types/api.types';
import { ChatService } from '../services/api/chat.service';
import { aiEngineClient } from '../services/api/client';
import { extractErrorMessage } from '../services/api/client';

export type ChatMessageEx = ChatMessage & {
  isFollowUp?: boolean;
  imageUri?: string;
};

interface ChatState {
  messages: ChatMessageEx[];
  sessionId: string;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  isSpeaking: boolean;
  domain: 'environment' | 'health';

  initializeSession: (childId?: string) => Promise<void>;
  setDomain: (domain: 'environment' | 'health') => void;
  sendMessage: (content: string, language?: Language) => Promise<void>;
  sendImage: (imageUri: string, language?: Language, childAge?: number) => Promise<void>;
  loadHistory: () => Promise<void>;
  addMessage: (message: ChatMessageEx) => void;
  clearMessages: () => void;
  clearError: () => void;
  speakText: (text: string, language?: Language) => Promise<void>;
  stopSpeaking: () => void;
}

async function playAudioBase64(base64Audio: string): Promise<void> {
  if (!base64Audio || base64Audio.length < 100) return;
  const uri = `data:audio/mp3;base64,${base64Audio}`;
  try {
    const { createAudioPlayer } = require('expo-audio');
    const player = createAudioPlayer({ uri });
    player.play();
    await new Promise<void>((resolve) => {
      const check = setInterval(() => { if (!player.playing) { clearInterval(check); resolve(); } }, 200);
      setTimeout(() => { clearInterval(check); resolve(); }, 60000);
    });
  } catch {
    if (Platform.OS === 'web') {
      const audio = new Audio(uri);
      await new Promise<void>((res) => { audio.onended = () => res(); audio.play().catch(res); });
    }
  }
}

async function speakViaTTS(text: string, langue: string): Promise<void> {
  if (!text || text.trim().length === 0) return;
  try {
    const res = await aiEngineClient.post('/chat/tts', { text: text.trim(), langue });
    const audioB64: string = res.data?.data?.audio_base64 ?? '';
    if (audioB64 && audioB64.length > 100) {
      await playAudioBase64(audioB64);
    } else {
      await speakWithExpoSpeech(text, langue);
    }
  } catch {
    await speakWithExpoSpeech(text, langue);
  }
}

function getExpoSpeech(): any | null {
  try { return require('expo-speech') ?? null; } catch { return null; }
}

function getVoiceLocale(language: string): string {
  const map: Record<string, string> = { fr: 'fr-FR', ln: 'fr-FR', sw: 'sw', en: 'en-NG' };
  return map[language] ?? 'fr-FR';
}

async function speakWithExpoSpeech(text: string, language: string): Promise<void> {
  const Speech = getExpoSpeech();
  if (!Speech) return;
  try { Speech.stop(); } catch { /* ignore */ }
  return new Promise<void>((resolve) => {
    Speech.speak(text, { language: getVoiceLocale(language), rate: 0.85, pitch: 1.1, volume: 1.0, onDone: resolve, onError: resolve, onStopped: resolve });
  });
}

function stopExpoSpeech(): void {
  const Speech = getExpoSpeech();
  if (!Speech) return;
  try { Speech.stop(); } catch { /* ignore */ }
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  sessionId: ChatService.generateSessionId(),
  isLoading: false,
  isSending: false,
  error: null,
  isSpeaking: false,
  domain: 'environment',

  setDomain: (domain: 'environment' | 'health') => set({ domain }),

  initializeSession: async (childId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const session = await ChatService.createSession(childId);
      set({ sessionId: session.sessionId, messages: [], isLoading: false });
    } catch (error) {
      set({ sessionId: ChatService.generateSessionId(), isLoading: false, error: extractErrorMessage(error) });
    }
  },

  sendMessage: async (content: string, language: Language = 'fr') => {
    const { sessionId, messages, domain } = get();
    if (!content.trim()) return;

    const userMessage: ChatMessageEx = { id: `msg_${Date.now()}_user`, role: 'user', content: content.trim(), timestamp: new Date() };
    set((state) => ({ messages: [...state.messages, userMessage], isSending: true, error: null }));

    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const result = await ChatService.sendMessage({ message: content.trim(), language, sessionId, history, domain });
      const chatResponse = result.response as ChatResponse & Record<string, any>;

      const mainText = (chatResponse.response || chatResponse.reponse || '').trim();
      const followUp = (chatResponse.followUpQuestion ?? chatResponse.question_suivi ?? null) as string | null;
      const displayText = mainText || '...';

      const somaMessages: ChatMessageEx[] = [{ id: `msg_${Date.now()}_assistant`, role: 'assistant', content: displayText, timestamp: new Date() }];
      if (followUp) somaMessages.push({ id: `msg_${Date.now() + 1}_assistant_followup`, role: 'assistant', content: followUp, timestamp: new Date(), isFollowUp: true });

      set((state) => ({ messages: [...state.messages, ...somaMessages], isSending: false }));

      const textToSpeak = followUp ? `${displayText} ${followUp}` : displayText;
      await speakViaTTS(textToSpeak, language);

    } catch (error) {
      const fallback = language === 'ln' ? "Bolimbisi ngai, nakoki te koyeba sik'oyo." : language === 'sw' ? 'Samahani, siwezi kujibu sasa hivi.' : 'Desole, je ne peux pas repondre pour le moment.';
      set((state) => ({ messages: [...state.messages, { id: `msg_${Date.now()}_error`, role: 'assistant', content: fallback, timestamp: new Date() }], isSending: false, error: extractErrorMessage(error) }));
    }
  },

  sendImage: async (imageUri: string, language: Language = 'fr', childAge: number = 8) => {
    if (!imageUri || imageUri.trim().length < 5) return;

    const userMessage: ChatMessageEx = { id: `msg_${Date.now()}_user`, role: 'user', content: 'Photo envoyee', timestamp: new Date(), imageUri };
    set((state) => ({ messages: [...state.messages, userMessage], isSending: true, error: null }));

    try {
      const formData = new FormData();
      formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'photo.jpg' } as any);
      formData.append('language', language);
      formData.append('child_age', String(childAge));

      const res = await aiEngineClient.post('/vision/analyze', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 });
      const data = res.data?.data;

      const species = data?.species || data?.espece || 'Element naturel';
      const desc = data?.childDescription || data?.description_enfant || '';
      const roleTxt = data?.ecologicalRole || data?.role_ecologique || '';
      const fact = data?.funFact || data?.fait_amusant || '';
      const action = data?.childAction || data?.action_enfant || '';
      const reply = `${species}\n\n${desc}\n\nRole : ${roleTxt}\n\nFait : ${fact}\n\n${action}`;

      const botMessage: ChatMessageEx = { id: `msg_${Date.now()}_assistant`, role: 'assistant', content: reply, timestamp: new Date() };
      set((state) => ({ messages: [...state.messages, botMessage], isSending: false }));

      const textToSpeak = `${species}. ${desc} ${roleTxt} ${fact} ${action}`;
      await speakViaTTS(textToSpeak, language);

    } catch (error) {
      const fallback = language === 'ln' ? 'Nakoki te komona foto oyo. Leka lisusu.' : language === 'sw' ? 'Siwezi kuona picha hiyo. Jaribu tena.' : 'Je ne peux pas analyser cette photo. Reessaie.';
      set((state) => ({ messages: [...state.messages, { id: `msg_${Date.now()}_error`, role: 'assistant', content: fallback, timestamp: new Date() }], isSending: false, error: extractErrorMessage(error) }));
    }
  },

  speakText: async (text: string, language: Language = 'fr') => {
    if (!text) return;
    set({ isSpeaking: true });
    await speakViaTTS(text, language);
    set({ isSpeaking: false });
  },

  stopSpeaking: () => { stopExpoSpeech(); set({ isSpeaking: false }); },

  loadHistory: async () => {
    const { sessionId } = get();
    set({ isLoading: true, error: null });
    try {
      const history = await ChatService.getSessionHistory(sessionId);
      const chatMessages: ChatMessageEx[] = history.messages.map((msg, i) => ({ id: `msg_${i}_${msg.role}`, role: msg.role as 'user' | 'assistant', content: msg.content, timestamp: new Date() }));
      set({ messages: chatMessages, isLoading: false });
    } catch (error) { set({ isLoading: false, error: extractErrorMessage(error) }); }
  },

  addMessage: (message: ChatMessageEx) => { set((state) => ({ messages: [...state.messages, message] })); },

  clearMessages: () => { get().stopSpeaking(); set({ messages: [], sessionId: ChatService.generateSessionId(), error: null }); },

  clearError: () => set({ error: null }),
}));