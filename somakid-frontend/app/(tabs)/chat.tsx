/**
 * SOMAKID AI - Chat Screen
 * Voice-first interface with persistent memory, elegant animations.
 * Full i18n integration with dynamic language detection sent to AI Engine.
 * 
 * VERSION FINALE AVEC GEMINI AUDIO NATIF
 * - Voice recognition: /api/v1/voice/recognize (STT)
 * - Chat + Audio: /chat/message-audio (Gemini 2.0 Flash Exp)
 * - Audio généré directement par Gemini (prononciation parfaite)
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Platform, TextInput, KeyboardAvoidingView, ScrollView,
  Easing, Dimensions, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Circle } from 'react-native-svg';
import { startRecording, stopRecording, audioFileToBase64 } from '../../utils/media';
import { takePhoto, pickFromGallery } from '../../utils/media';
import { aiEngineClient } from '../../services/api/client';
import { useChatStore } from '../../store/chat.store';
import { useTranslation } from '../../hooks/useTranslation';
import { getCurrentLanguage } from '../../i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

const STORAGE_VOICE_HISTORY_KEY = 'somakid_voice_history';
const STORAGE_SESSION_ID_KEY = 'somakid_voice_session_id';
const MAX_LOCAL_MESSAGES = 100;
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

// =============================================================================
// SUPPORTED LANGUAGES FOR VOICE (Backend only accepts fr, ln, sw)
// =============================================================================
type SupportedVoiceLanguage = 'fr' | 'ln' | 'sw';

function normalizeToSupportedLanguage(lang: string): SupportedVoiceLanguage {
  const supported: Record<string, SupportedVoiceLanguage> = {
    'fr': 'fr',
    'ln': 'ln', 
    'sw': 'sw',
    'en': 'fr',
    'en-US': 'fr',
    'en-GB': 'fr',
  };
  return supported[lang] || 'fr';
}

async function getOrCreateSessionId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_SESSION_ID_KEY);
    if (stored) return stored;
    const newId = `voice_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await AsyncStorage.setItem(STORAGE_SESSION_ID_KEY, newId);
    return newId;
  } catch {
    return `voice_${Date.now()}`;
  }
}

async function loadLocalHistory(): Promise<Message[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_VOICE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveLocalHistory(messages: Message[]): Promise<void> {
  try {
    const trimmed = messages.slice(-MAX_LOCAL_MESSAGES);
    await AsyncStorage.setItem(STORAGE_VOICE_HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('saveLocalHistory error', e);
  }
}

async function playAudioDirect(base64: string): Promise<void> {
  if (!base64 || base64.length < 100) return;
  const uri = `data:audio/mp3;base64,${base64}`;
  try {
    const { createAudioPlayer } = require('expo-audio');
    const player = createAudioPlayer({ uri });
    player.play();
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (!player.playing) { clearInterval(check); resolve(); }
      }, 200);
      setTimeout(() => { clearInterval(check); resolve(); }, 20000);
    });
  } catch {
    if (Platform.OS === 'web') {
      const audio = new Audio(uri);
      await new Promise<void>((res) => {
        audio.onended = () => res();
        audio.play().catch(res);
      });
    }
  }
}

type AppState = 'idle' | 'listening' | 'thinking' | 'speaking';
type Mode = 'voice' | 'text' | 'camera';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageUri?: string;
  timestamp?: number;
}

function SomaIcon({ size = 22, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </Svg>
  );
}

function MicIcon({ color = '#fff', size = 32 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <Path d="M12 19v4" />
      <Path d="M8 23h8" />
    </Svg>
  );
}

function SendIcon({ color = '#fff' }: { color?: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 2L11 13" />
      <Path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </Svg>
  );
}

function CameraIcon({ size = 40, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <Circle cx="12" cy="13" r="4" />
    </Svg>
  );
}

function GalleryIcon({ size = 40, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <Path d="M7 10l5 5 5-5" />
      <Path d="M12 15V3" />
    </Svg>
  );
}

function OrbPulse({ active, color }: { active: boolean; color: string }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    } else {
      anim.setValue(1);
    }
  }, [active]);
  return (
    <Animated.View style={[styles.orbPulse, { transform: [{ scale: anim }], borderColor: color + '30', backgroundColor: color + '08' }]} />
  );
}

function SoundBars() {
  const bars = useRef(Array.from({ length: 5 }, () => new Animated.Value(0.3))).current;
  useEffect(() => {
    const anims = bars.map((bar, i) =>
      Animated.loop(Animated.sequence([
        Animated.timing(bar, { toValue: 1, duration: 280 + i * 70, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bar, { toValue: 0.2, duration: 280 + i * 70, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]))
    );
    Animated.stagger(55, anims).start();
    return () => anims.forEach((a) => a.stop());
  }, []);
  return (
    <View style={sb.container}>
      {bars.map((bar, i) => (
        <Animated.View key={i} style={[sb.bar, { transform: [{ scaleY: bar }] }]} />
      ))}
    </View>
  );
}
const sb = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36 },
  bar: { width: 4, height: 36, borderRadius: 3, backgroundColor: '#fff', opacity: 0.92 },
});

function Bubble({ msg, t }: { msg: Message; t: (key: string) => string }) {
  const isUser = msg.role === 'user';
  const anim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 85, friction: 10 }).start();
  }, []);
  
  return (
    <Animated.View style={[
      styles.bubble,
      isUser ? styles.bubbleUser : styles.bubbleBot,
      {
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
          { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
        ],
      },
    ]}>
      {!isUser && (
        <View style={styles.bubbleAvatar}>
          <View style={styles.bubbleAvatarIcon}>
            <SomaIcon size={14} color={Colors.primary} />
          </View>
          <Text style={styles.bubbleLabel}>{t('chat.title')}</Text>
        </View>
      )}
      {msg.imageUri && <Image source={{ uri: msg.imageUri }} style={styles.bubbleImage} />}
      <Text style={isUser ? styles.bubbleTextUser : styles.bubbleTextBot}>{msg.text}</Text>
    </Animated.View>
  );
}

function TypingIndicator({ t }: { t: (key: string) => string }) {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(Animated.sequence([
        Animated.delay(i * 180),
        Animated.timing(d, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(d, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]))
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);
  return (
    <View style={[styles.bubble, styles.bubbleBot]}>
      <View style={styles.bubbleAvatar}>
        <View style={styles.bubbleAvatarIcon}>
          <SomaIcon size={14} color={Colors.primary} />
        </View>
        <Text style={styles.bubbleLabel}>{t('chat.title')}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 5, paddingVertical: 4 }}>
        {dots.map((d, i) => (
          <Animated.View
            key={i}
            style={{
              width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary,
              transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }],
              opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            }}
          />
        ))}
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const { t } = useTranslation();
  const [appState, setAppState] = useState<AppState>('idle');
  const [mode, setMode] = useState<Mode>('voice');
  const [textInput, setTextInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(40)).current;
  const orbScale = useRef(new Animated.Value(0.6)).current;

  const storeMessages = useChatStore((s) => s.messages);
  const storeSending = useChatStore((s) => s.isSending);
  const sendImage = useChatStore((s) => s.sendImage);
  const sendMessage = useChatStore((s) => s.sendMessage);

  useEffect(() => {
    (async () => {
      const sid = await getOrCreateSessionId();
      setSessionId(sid);
      const history = await loadLocalHistory();
      if (history.length > 0) setMessages(history);
      setIsLoading(false);
      Animated.parallel([
        Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideUp, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11, delay: 80 }),
        Animated.spring(orbScale, { toValue: 1, useNativeDriver: true, tension: 55, friction: 9, delay: 180 }),
      ]).start();
    })();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const displayMessages: Message[] =
    mode === 'voice'
      ? messages
      : storeMessages.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.content,
          imageUri: (m as any).imageUri,
          timestamp: Date.now(),
        }));

  const isThinking = mode === 'voice' ? appState === 'thinking' : storeSending;
  const hasMsgs = displayMessages.length > 0;

  const addLocalMessage = useCallback(
    async (role: Message['role'], text: string, uri?: string) => {
      const msg: Message = {
        id: `${Date.now()}_${Math.random()}`,
        role,
        text,
        imageUri: uri,
        timestamp: Date.now(),
      };
      setMessages((prev) => {
        const updated = [...prev, msg];
        saveLocalHistory(updated).catch(console.warn);
        return updated;
      });
    },
    [],
  );

  // =============================================================================
  // VOICE HANDLER - Version finale avec GEMINI AUDIO NATIF
  // Step 1: STT via /voice/recognize
  // Step 2: Chat + Audio natif via /chat/message-audio (Gemini 2.0 Flash Exp)
  // =============================================================================
  const handleVoicePress = useCallback(async () => {
    if (appState === 'speaking') return;

    if (appState === 'listening') {
      abortRef.current?.abort();
      setAppState('thinking');

      const uri = await stopRecording();
      if (!uri) { setAppState('idle'); return; }

      const b64 = await audioFileToBase64(uri);
      if (!b64 || b64.length < 100) { setAppState('idle'); return; }

      const rawLang = getCurrentLanguage();
      const voiceLang = normalizeToSupportedLanguage(rawLang);
      
      console.log(`[Voice] Using language: ${voiceLang} (original: ${rawLang})`);

      try {
        abortRef.current = new AbortController();
        
        // Step 1: Speech to text
        const sttRes = await aiEngineClient.post(
          '/voice/recognize',
          {
            audio_base64: b64,
            langue: voiceLang,
            identifiant_session: sessionId,
          },
          { signal: abortRef.current.signal },
        );
        
        const transcription = sttRes.data?.data?.text ?? '';
        
        if (transcription && transcription.trim()) {
          await addLocalMessage('user', transcription.trim());
          
          // Step 2: Get AI response with NATIVE AUDIO from Gemini 2.0 Flash Exp
          // Utilise le nouveau endpoint /chat/message-audio qui retourne audio_base64
          const chatRes = await aiEngineClient.post(
            '/chat/message-audio',
            {
              message: transcription.trim(),
              langue: rawLang,
              identifiant_session: sessionId,
              historique: messages.slice(-10).map(m => ({ role: m.role, content: m.text })),
            },
          );
          
          const chatData = chatRes.data?.data ?? {};
          const somaResponse = chatData.reponse || chatData.response || '';
          const audioBase64 = chatData.audio_base64 || '';
          
          if (somaResponse && somaResponse.trim()) {
            await addLocalMessage('assistant', somaResponse.trim());
            
            // Jouer l'audio généré directement par Gemini (prononciation parfaite !)
            if (audioBase64 && audioBase64.length > 100) {
              setAppState('speaking');
              await playAudioDirect(audioBase64);
            } else {
              console.warn('[Voice] No audio received from Gemini');
            }
          }
        } else {
          await addLocalMessage('assistant', t('chat.sorryNotUnderstand'));
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError' && e?.name !== 'CanceledError') {
          console.error('Voice error:', e);
          await addLocalMessage('assistant', t('chat.sorryError'));
        }
      }
      setAppState('idle');
      return;
    }

    const started = await startRecording();
    if (started) setAppState('listening');
  }, [appState, sessionId, addLocalMessage, t, messages]);

  const handleTextSend = useCallback(async () => {
    const msg = textInput.trim();
    if (!msg) return;
    setTextInput('');
    const userLanguage = getCurrentLanguage();
    await sendMessage(msg, userLanguage as any);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, [textInput, sendMessage]);

  const handleCamera = useCallback(async () => {
    const uri = await takePhoto();
    if (!uri) return;
    setImageUri(uri);
    const userLanguage = getCurrentLanguage();
    await sendImage(uri, userLanguage as any, 8);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, [sendImage]);

  const handleGallery = useCallback(async () => {
    const uri = await pickFromGallery();
    if (!uri) return;
    setImageUri(uri);
    const userLanguage = getCurrentLanguage();
    await sendImage(uri, userLanguage as any, 8);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, [sendImage]);

  const handleClearHistory = useCallback(async () => {
    setMessages([]);
    await AsyncStorage.removeItem(STORAGE_VOICE_HISTORY_KEY);
  }, []);

  const ORB = {
    idle:      { label: t('chat.pressToSpeak'), colors: [Colors.primary, Colors.primaryDark] as const, statusColor: Colors.primary },
    listening: { label: t('chat.listening'), colors: [Colors.danger, '#B91C1C'] as const, statusColor: Colors.danger },
    thinking:  { label: t('chat.thinking'), colors: [Colors.accent, Colors.accentDark] as const, statusColor: Colors.accent },
    speaking:  { label: t('chat.speaking'), colors: [Colors.success, Colors.primaryDark] as const, statusColor: Colors.success },
  };
  const orb = ORB[appState];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Animated.View style={{ opacity: fadeIn, alignItems: 'center', gap: Spacing.md }}>
            <SomaIcon size={48} color={Colors.primary} />
            <Text style={styles.loadingText}>{t('chat.loading')}</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Animated.View style={[styles.header, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <View style={styles.logoRow}>
          <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.logoBadge}>
            <SomaIcon size={22} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>{t('chat.title')}</Text>
            <Text style={styles.headerSub}>{t('chat.subtitle')}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {mode === 'voice' && messages.length > 0 && (
            <TouchableOpacity onPress={handleClearHistory} activeOpacity={0.7} style={styles.clearBtn}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.gray500} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </Svg>
            </TouchableOpacity>
          )}

          <View style={styles.switcher}>
            {(['voice', 'text', 'camera'] as Mode[]).map((m) => {
              const isActive = mode === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  activeOpacity={0.75}
                  style={[styles.switchBtn, isActive && styles.switchBtnOn]}
                >
                  {m === 'voice' && <MicIcon size={18} color={isActive ? '#fff' : Colors.gray500} />}
                  {m === 'text' && (
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={isActive ? '#fff' : Colors.gray500} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M11 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </Svg>
                  )}
                  {m === 'camera' && <CameraIcon size={18} color={isActive ? '#fff' : Colors.gray500} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Animated.View>

      {hasMsgs && (
        <ScrollView
          ref={scrollRef}
          style={styles.msgScroll}
          contentContainerStyle={[styles.msgContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 80 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
        >
          {displayMessages.map((m) => <Bubble key={m.id} msg={m} t={t} />)}
          {isThinking && <TypingIndicator t={t} />}
        </ScrollView>
      )}

      {mode === 'voice' && (
        <Animated.View style={[
          styles.voiceZone,
          !hasMsgs && styles.voiceZoneFull,
          { transform: [{ scale: orbScale }], opacity: fadeIn, paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 },
        ]}>
          <Text style={styles.orbStatus}>{orb.label}</Text>
          <View style={styles.orbArea}>
            <OrbPulse active={appState === 'listening'} color={orb.statusColor} />
            <TouchableOpacity
              onPress={handleVoicePress}
              activeOpacity={0.85}
              disabled={appState === 'speaking'}
              style={[styles.orbBtn, appState === 'speaking' && { opacity: 0.6 }]}
            >
              <LinearGradient
                colors={orb.colors}
                start={{ x: 0.15, y: 0 }}
                end={{ x: 0.85, y: 1 }}
                style={styles.orbGrad}
              >
                {appState === 'listening' ? <SoundBars /> : <MicIcon size={36} />}
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {messages.length > 0 && (
            <View style={styles.memoryBadge}>
              <SomaIcon size={14} color={Colors.primary} />
              <Text style={styles.memoryHint}>
                {Math.floor(messages.length / 2)} {t('chat.memory')}
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {mode === 'text' && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.textZone}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {!hasMsgs && !storeSending && (
            <Animated.View style={[styles.emptyState, { opacity: fadeIn }]}>
              <SomaIcon size={56} color={Colors.primary} />
              <Text style={styles.emptyTitle}>{t('chat.askQuestion')}</Text>
              <Text style={styles.emptySub}>{t('chat.askQuestionDesc')}</Text>
            </Animated.View>
          )}
          <View style={[styles.inputBar, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 10 }]}>
            <TextInput
              style={styles.input}
              value={textInput}
              onChangeText={setTextInput}
              placeholder={t('chat.writePlaceholder')}
              placeholderTextColor={Colors.gray400}
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit
              onSubmitEditing={handleTextSend}
              editable={!storeSending}
            />
            <TouchableOpacity
              onPress={handleTextSend}
              activeOpacity={0.8}
              disabled={!textInput.trim() || storeSending}
              style={[styles.sendWrap, (!textInput.trim() || storeSending) && { opacity: 0.3 }]}
            >
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.sendGrad}>
                <SendIcon />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {mode === 'camera' && (
        <Animated.View style={[
          styles.cameraZone,
          !hasMsgs && styles.voiceZoneFull,
          { transform: [{ scale: orbScale }], opacity: fadeIn, paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 },
        ]}>
          {storeSending && <Text style={styles.orbStatus}>{t('chat.analyzing')}</Text>}
          <View style={styles.cameraButtons}>
            <TouchableOpacity
              onPress={handleCamera}
              activeOpacity={0.8}
              disabled={storeSending}
              style={[styles.cameraBtn, storeSending && { opacity: 0.5 }]}
            >
              <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.cameraGrad}>
                <CameraIcon size={44} />
                <Text style={styles.cameraLabel}>{t('chat.camera')}</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleGallery}
              activeOpacity={0.8}
              disabled={storeSending}
              style={[styles.cameraBtn, storeSending && { opacity: 0.5 }]}
            >
              <LinearGradient colors={[Colors.secondary, Colors.secondaryDark]} style={styles.cameraGrad}>
                <GalleryIcon size={44} />
                <Text style={styles.cameraLabel}>{t('chat.gallery')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          )}
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.gray100 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.gray500, fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.gray200,
    ...Shadows.sm,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBadge: {
    width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    ...Shadows.colored(Colors.primary),
  },
  headerTitle: { fontSize: 20, fontWeight: Typography.weights.extrabold, color: Colors.black, letterSpacing: 1.2 },
  headerSub: { fontSize: 11, color: Colors.gray500, fontWeight: Typography.weights.medium },

  switcher: {
    flexDirection: 'row', backgroundColor: Colors.gray100,
    borderRadius: 20, padding: 3, borderWidth: 1, borderColor: Colors.gray200, gap: 2,
  },
  switchBtn: { width: 36, height: 30, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  switchBtnOn: { backgroundColor: Colors.primary },
  clearBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.gray100,
    borderWidth: 1, borderColor: Colors.gray200,
  },

  msgScroll: { flex: 1 },
  msgContent: { paddingHorizontal: Spacing.base, paddingTop: Spacing.md, gap: 10 },

  bubble: {
    maxWidth: '82%', alignSelf: 'flex-start',
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.gray200,
    paddingHorizontal: 16, paddingVertical: 12,
    ...Shadows.sm,
  },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: Colors.primarySurface, borderColor: Colors.primary + '30' },
  bubbleBot: { backgroundColor: Colors.white },
  bubbleAvatar: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  bubbleAvatarIcon: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  bubbleLabel: { fontSize: 10, color: Colors.primary, fontWeight: Typography.weights.extrabold, letterSpacing: 1.2, textTransform: 'uppercase' },
  bubbleTextUser: { color: Colors.gray800, fontSize: 15, lineHeight: 22, fontWeight: Typography.weights.medium },
  bubbleTextBot: { color: Colors.gray700, fontSize: 15, lineHeight: 22 },
  bubbleImage: { width: '100%', height: 180, borderRadius: BorderRadius.lg, marginBottom: 8 },

  voiceZone: { alignItems: 'center', justifyContent: 'center', paddingTop: 20, gap: 24 },
  voiceZoneFull: { flex: 1 },
  orbStatus: { fontSize: 15, fontWeight: Typography.weights.semibold, color: Colors.gray600, textAlign: 'center' },
  orbArea: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  orbPulse: {
    position: 'absolute', width: 190, height: 190, borderRadius: 95,
    borderWidth: 2,
  },
  orbBtn: {
    borderRadius: 75, ...Shadows.colored(Colors.primary),
  },
  orbGrad: {
    width: 150, height: 150, borderRadius: 75,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
  },
  memoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.white, borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderWidth: 1, borderColor: Colors.gray200, ...Shadows.sm,
  },
  memoryHint: { fontSize: 12, color: Colors.gray500, fontWeight: Typography.weights.medium },

  textZone: { flex: 1, justifyContent: 'flex-end' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 24, fontWeight: Typography.weights.extrabold, color: Colors.black },
  emptySub: { fontSize: 15, color: Colors.gray500, textAlign: 'center', lineHeight: 22 },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },
  input: {
    flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.xl,
    borderWidth: 1.5, borderColor: Colors.gray200,
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    color: Colors.gray800, fontSize: 15, maxHeight: 120, lineHeight: 22,
    ...Shadows.sm,
  },
  sendWrap: { borderRadius: BorderRadius.xl, ...Shadows.colored(Colors.primary) },
  sendGrad: { width: 48, height: 48, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

  cameraZone: { alignItems: 'center', justifyContent: 'center', paddingTop: 16, gap: 28 },
  cameraButtons: { flexDirection: 'row', gap: 24 },
  cameraBtn: {
    borderRadius: BorderRadius['2xl'], overflow: 'hidden',
    ...Shadows.colored(Colors.primary),
  },
  cameraGrad: {
    width: 150, height: 150, borderRadius: BorderRadius['2xl'],
    alignItems: 'center', justifyContent: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  cameraLabel: { fontSize: 16, fontWeight: Typography.weights.bold, color: '#fff' },
  previewImage: {
    width: SCREEN_W - 48, height: 240, borderRadius: BorderRadius.xl,
    borderWidth: 2, borderColor: Colors.primary + '40',
  },
});