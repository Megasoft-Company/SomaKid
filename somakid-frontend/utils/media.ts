/**
 * SOMAKID AI - Media Utilities
 * Image processing, camera, gallery, and audio recording helpers.
 *
 * Audio: expo-audio (SDK 52+, inclus dans Expo Go)
 * Docs: https://docs.expo.dev/versions/latest/sdk/audio/
 * FileSystem: expo-file-system/legacy (API compatible Expo Go)
 */

import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

// =============================================================================
// Image Functions
// =============================================================================

export async function takePhoto(): Promise<string | null> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to identify species.');
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch {
    Alert.alert('Error', 'Could not open camera.');
    return null;
  }
}

export async function pickFromGallery(): Promise<string | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch {
    Alert.alert('Error', 'Could not open gallery.');
    return null;
  }
}

export function getFileNameFromUri(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1] || 'capture.jpg';
}

export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('/');
}

// =============================================================================
// Audio Recording — expo-audio (API impérative)
// AudioModule.requestRecordingPermissionsAsync()
// AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY)
// recorder.prepareToRecordAsync() + .record() + .stop()
// recorder.uri → chemin du fichier enregistré
// =============================================================================

let activeRecorder: any = null;

function loadExpoAudio(): any | null {
  try {
    const mod = require('expo-audio');
    if (!mod.AudioModule) return null;
    return mod;
  } catch {
    return null;
  }
}

// --------------------------------------------------------------------------
// Web fallback via MediaRecorder
// --------------------------------------------------------------------------

let webMediaRecorder: any = null;
let webAudioChunks: BlobPart[] = [];
let webResolve: ((uri: string | null) => void) | null = null;

async function startRecordingWeb(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    webAudioChunks = [];
    webMediaRecorder = new (window as any).MediaRecorder(stream);
    webMediaRecorder.ondataavailable = (e: any) => {
      if (e.data.size > 0) webAudioChunks.push(e.data);
    };
    webMediaRecorder.onstop = () => {
      const blob = new Blob(webAudioChunks, { type: 'audio/webm' });
      const uri = URL.createObjectURL(blob);
      if (webResolve) { webResolve(uri); webResolve = null; }
      stream.getTracks().forEach((t: any) => t.stop());
    };
    webMediaRecorder.start();
    return true;
  } catch {
    return false;
  }
}

async function stopRecordingWeb(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!webMediaRecorder) { resolve(null); return; }
    webResolve = resolve;
    webMediaRecorder.stop();
    webMediaRecorder = null;
  });
}

// --------------------------------------------------------------------------
// Native: expo-audio
// --------------------------------------------------------------------------

async function startRecordingNative(): Promise<boolean> {
  const expoAudio = loadExpoAudio();
  if (!expoAudio) {
    Alert.alert('Non disponible', 'Installez expo-audio : npx expo install expo-audio');
    return false;
  }

  const { AudioModule, RecordingPresets } = expoAudio;

  try {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "L'accès au microphone est nécessaire pour les questions vocales.");
      return false;
    }

    await AudioModule.setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
    await recorder.prepareToRecordAsync();
    recorder.record();
    activeRecorder = recorder;
    return true;
  } catch (err) {
    console.warn('[startRecordingNative] ERREUR:', err);
    Alert.alert('Non disponible', "L'enregistrement n'a pas pu démarrer. Tapez votre question.");
    return false;
  }
}

async function stopRecordingNative(): Promise<string | null> {
  if (!activeRecorder) return null;
  try {
    await activeRecorder.stop();

    const uri: string | null = activeRecorder.uri ?? null;
    console.log('[stopRecordingNative] URI:', uri);

    activeRecorder = null;

    const expoAudio = loadExpoAudio();
    if (expoAudio) {
      await expoAudio.AudioModule.setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: false,
      });
    }
    return uri;
  } catch (err) {
    console.warn('[stopRecordingNative] ERREUR:', err);
    activeRecorder = null;
    return null;
  }
}

// --------------------------------------------------------------------------
// API publique
// --------------------------------------------------------------------------

export async function startRecording(): Promise<boolean> {
  if (Platform.OS === 'web') return startRecordingWeb();
  return startRecordingNative();
}

export async function stopRecording(): Promise<string | null> {
  if (Platform.OS === 'web') return stopRecordingWeb();
  return stopRecordingNative();
}

export function isCurrentlyRecording(): boolean {
  if (Platform.OS === 'web') return webMediaRecorder !== null;
  return activeRecorder !== null;
}

// =============================================================================
// Audio → Base64
// Utilise expo-file-system/legacy pour la compatibilité Expo Go
// =============================================================================

export async function audioFileToBase64(uri: string): Promise<string> {
  try {
    console.log('[audioFileToBase64] URI reçu:', uri);

    // Web ou blob URL
    if (Platform.OS === 'web' || uri.startsWith('blob:') || uri.startsWith('http')) {
      const response = await fetch(uri);
      const blob = await response.blob();
      console.log('[audioFileToBase64] Blob size:', blob.size, 'type:', blob.type);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = ((reader.result as string).split(',')[1]) ?? '';
          console.log('[audioFileToBase64] Base64 length:', base64.length);
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    // Native — expo-file-system/legacy (API stable dans Expo Go)
    const FileSystem = require('expo-file-system/legacy');

    const fileInfo = await FileSystem.getInfoAsync(uri);
    console.log('[audioFileToBase64] File info:', JSON.stringify(fileInfo));

    if (!fileInfo.exists) {
      console.warn('[audioFileToBase64] Fichier introuvable:', uri);
      return '';
    }
    if ((fileInfo as any).size === 0) {
      console.warn('[audioFileToBase64] Fichier vide (0 bytes):', uri);
      return '';
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log('[audioFileToBase64] Base64 length:', base64?.length ?? 0);
    return base64 ?? '';
  } catch (err) {
    console.warn('[audioFileToBase64] ERREUR:', err);
    return '';
  }
}