/**
 * SOMAKID AI - Explorer Screen (Professional UI/UX - Green Theme)
 * Biodiversity explorer with image analysis, voice feedback, and elegant animations.
 * Full i18n integration with instant language switching.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { EmptyState } from '../../components/ui/EmptyState';
import { takePhoto, pickFromGallery } from '../../utils/media';
import { formatPoints } from '../../utils/formatting';
import { aiEngineClient } from '../../services/api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows, Animation } from '../../constants/theme';
import { getCurrentLanguage } from '../../i18n';
import type { ImageAnalysisResult } from '../../types/api.types';
import Svg, { Path, Circle } from 'react-native-svg';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

async function playAudioDirect(base64: string): Promise<void> {
  if (!base64 || base64.length < 100) return;
  const uri = `data:audio/mp3;base64,${base64}`;
  try {
    const { createAudioPlayer } = require('expo-audio');
    const player = createAudioPlayer({ uri });
    player.play();
    await new Promise<void>((resolve) => {
      const check = setInterval(() => { if (!player.playing) { clearInterval(check); resolve(); } }, 200);
      setTimeout(() => { clearInterval(check); resolve(); }, 20000);
    });
  } catch {
    if (Platform.OS === 'web') {
      const audio = new Audio(uri);
      await new Promise<void>((res) => { audio.onended = () => res(); audio.play().catch(res); });
    }
  }
}

async function speakViaTTS(text: string, langue: string = 'fr'): Promise<void> {
  if (!text || text.trim().length < 3) return;
  try {
    const res = await aiEngineClient.post('/chat/tts', { text: text.trim(), langue });
    const audioB64: string = res.data?.data?.audio_base64 ?? '';
    if (audioB64 && audioB64.length > 100) {
      await playAudioDirect(audioB64);
    }
  } catch {}
}

function InfoCard({ title, content, color }: { title: string; content: string; color: string }) {
  return (
    <View style={[styles.infoCard, { borderLeftColor: color }]}>
      <Text style={[styles.infoCardTitle, { color }]}>{title}</Text>
      <Text style={styles.infoCardContent}>{content}</Text>
    </View>
  );
}

function ResultContent({ result, t }: { result: ImageAnalysisResult; t: (key: string) => string }) {
  return (
    <View style={styles.resultContent}>
      <InfoCard title={t('explorer.about')} content={result.childDescription} color={Colors.primary} />
      <InfoCard title={t('explorer.roleInNature')} content={result.ecologicalRole} color={Colors.secondary} />
      <InfoCard title={t('explorer.didYouKnowTitle')} content={result.funFact} color={Colors.modules.quiz} />
      {result.threats && <InfoCard title={t('explorer.threats')} content={result.threats} color={Colors.earth} />}
      <InfoCard title={t('explorer.whatYouCanDo')} content={result.childAction} color={Colors.modules.chat} />
      {result.safetyAdvice && <InfoCard title={t('explorer.safetyAdvice')} content={result.safetyAdvice} color={Colors.danger} />}
    </View>
  );
}

export default function ExplorerScreen() {
  const { t } = useTranslation();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeChild } = useAuth();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = useCallback(() => {
    pulseAnim.setValue(1);
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.04, duration: Animation.slow, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: Animation.slow, useNativeDriver: true }),
    ])).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => { pulseAnim.stopAnimation(); pulseAnim.setValue(1); }, [pulseAnim]);

  const clearResult = useCallback(() => { setResult(null); setImageUri(null); setError(null); }, []);

  const handleImageAnalysis = useCallback(async (uri: string) => {
    setImageUri(uri);
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    startPulse();

    // Récupérer la langue courante pour l'envoyer à l'API
    const currentLang = getCurrentLanguage();

    try {
      const formData = new FormData();
      formData.append('image', { uri, type: 'image/jpeg', name: 'photo.jpg' } as any);
      formData.append('language', currentLang);
      formData.append('child_age', String(activeChild?.age ?? 8));

      const res = await aiEngineClient.post('/vision/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      const data = res.data?.data;

      const mappedResult: ImageAnalysisResult = {
        species: data?.species || data?.espece || t('explorer.unknownSpecies'),
        localName: data?.localName || data?.nom_local || null,
        category: data?.category || data?.categorie || 'other',
        childDescription: data?.childDescription || data?.description_enfant || '',
        ecologicalRole: data?.ecologicalRole || data?.role_ecologique || '',
        funFact: data?.funFact || data?.fait_amusant || '',
        threats: data?.threats || data?.menaces || null,
        childAction: data?.childAction || data?.action_enfant || '',
        emoji: data?.emoji || '🌿',
        dangerLevel: data?.dangerLevel || data?.niveau_danger || 'none',
        safetyAdvice: data?.safetyAdvice || data?.conseils_securite || null,
        pointsEarned: data?.pointsEarned || data?.points_gagnes || 10,
        guardianTitle: data?.guardianTitle || data?.titre_gardien || null,
        confidence: data?.confidence || data?.confiance || null,
      };

      setResult(mappedResult);

      // Lecture vocale du résultat dans la langue courante
      const species = mappedResult.species || '';
      const desc = mappedResult.childDescription || '';
      const role = mappedResult.ecologicalRole || '';
      const fact = mappedResult.funFact || '';
      const action = mappedResult.childAction || '';
      const textToSpeak = `${species}. ${desc} ${role} ${fact} ${action}`;

      if (textToSpeak.trim().length > 3) {
        setIsSpeaking(true);
        await speakViaTTS(textToSpeak.trim(), currentLang);
        setIsSpeaking(false);
      }
    } catch {
      setError(t('explorer.analysisError'));
    } finally {
      stopPulse();
      setIsAnalyzing(false);
    }
  }, [activeChild, startPulse, stopPulse, t]);

  const handleTakePhoto = useCallback(async () => { const uri = await takePhoto(); if (uri) handleImageAnalysis(uri); }, [handleImageAnalysis]);
  const handlePickGallery = useCallback(async () => { const uri = await pickFromGallery(); if (uri) handleImageAnalysis(uri); }, [handleImageAnalysis]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]} 
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* ── Header ── */}
        <LinearGradient colors={[Colors.gradients.heroStart, Colors.gradients.heroMiddle]} style={styles.header}>
          <View style={styles.headerContent}>
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
              <Path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            </Svg>
            <View>
              <Text style={styles.headerTitle}>{t('explorer.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('explorer.subtitle')}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.mainArea}>
          {/* ── Analyse en cours ── */}
          {isAnalyzing && (
            <Animated.View style={[styles.loadingZone, { transform: [{ scale: pulseAnim }] }]}>
              <LoadingSpinner message={t('explorer.analyzing')} color={Colors.primary} />
            </Animated.View>
          )}

          {/* ── SOMA parle ── */}
          {isSpeaking && (
            <Animated.View style={[styles.speakingZone]}>
              <LoadingSpinner message={t('explorer.speaking')} color={Colors.success} />
            </Animated.View>
          )}

          {/* ── Erreur ── */}
          {error && !isAnalyzing && <ErrorDisplay message={error} onRetry={clearResult} />}

          {/* ── Résultat ── */}
          {result && !isAnalyzing && !error && (
            <View style={styles.resultContainer}>
              <View style={styles.resultHeader}>
                <View style={styles.resultImageContainer}>
                  {imageUri && <Image source={{ uri: imageUri }} style={styles.resultImage} contentFit="cover" />}
                </View>
                <View style={styles.resultHeaderInfo}>
                  <Text style={styles.resultEmoji}>{result.emoji}</Text>
                  <Text style={styles.resultSpecies}>{result.species}</Text>
                  {result.localName && (
                    <Text style={styles.resultLocalName}>{t('explorer.alsoKnownAs')}: {result.localName}</Text>
                  )}
                  <View style={styles.pointsBadge}>
                    <Text style={styles.pointsBadgeText}>+{formatPoints(result.pointsEarned)} {t('common.points')}</Text>
                  </View>
                </View>
              </View>
              <ResultContent result={result} t={t} />
              <TouchableOpacity 
                style={[styles.retryButton, { backgroundColor: Colors.primary }]} 
                onPress={clearResult} 
                activeOpacity={0.85}
              >
                <Text style={styles.retryButtonText}>{t('explorer.exploreAgain')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── État vide ── */}
          {!isAnalyzing && !error && !result && (
            <EmptyState
              emoji="📸"
              title={t('explorer.takePhoto')}
              description={t('explorer.takePhotoDesc')}
            />
          )}
        </View>

        {/* ── Boutons d'action ── */}
        {!isAnalyzing && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: Colors.primary }, Shadows.colored(Colors.primary)]} 
              onPress={handleTakePhoto} 
              disabled={isAnalyzing} 
              activeOpacity={0.8}
            >
              <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <Circle cx="12" cy="13" r="4" />
              </Svg>
              <Text style={styles.actionText}>{t('explorer.camera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: Colors.secondary }, Shadows.colored(Colors.secondary)]} 
              onPress={handlePickGallery} 
              disabled={isAnalyzing} 
              activeOpacity={0.8}
            >
              <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <Path d="M7 10l5 5 5-5" />
                <Path d="M12 15V3" />
              </Svg>
              <Text style={styles.actionText}>{t('explorer.gallery')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Conseils d'exploration ── */}
        {!result && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('explorer.explorationTips')}</Text>
            {[
              { 
                icon: <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={Colors.earth} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Circle cx="12" cy="12" r="5" /><Path d="M12 1v2" /><Path d="M12 21v2" /><Path d="M4.22 4.22l1.42 1.42" /><Path d="M18.36 18.36l1.42 1.42" /><Path d="M1 12h2" /><Path d="M21 12h2" /><Path d="M4.22 19.78l1.42-1.42" /><Path d="M18.36 5.64l1.42-1.42" /></Svg>, 
                text: t('explorer.tip1') 
              },
              { 
                icon: <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={Colors.earth} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Circle cx="12" cy="12" r="10" /><Circle cx="12" cy="12" r="6" /><Circle cx="12" cy="12" r="2" /></Svg>, 
                text: t('explorer.tip2') 
              },
              { 
                icon: <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={Colors.earth} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 20V10" /><Path d="M18 20V4" /><Path d="M6 20v-4" /></Svg>, 
                text: t('explorer.tip3') 
              },
              { 
                icon: <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={Colors.earth} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>, 
                text: t('explorer.tip4') 
              },
            ].map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                {tip.icon}
                <Text style={styles.tipText}>{tip.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scroll: { flexGrow: 1 },

  // ── Header ──
  header: { padding: Spacing.xl, paddingTop: Spacing.lg },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerTitle: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, color: Colors.white, marginBottom: 4 },
  headerSubtitle: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.8)' },

  // ── Main Area ──
  mainArea: { margin: Spacing.base, minHeight: 250 },

  // ── Loading ──
  loadingZone: { borderRadius: BorderRadius['2xl'], overflow: 'hidden', minHeight: 230, justifyContent: 'center' },
  speakingZone: { borderRadius: BorderRadius['2xl'], backgroundColor: Colors.successSurface, minHeight: 80, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },

  // ── Result ──
  resultContainer: { backgroundColor: Colors.white, borderRadius: BorderRadius['2xl'], padding: Spacing.xl, ...Shadows.md },
  resultHeader: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  resultImageContainer: { width: 120, height: 120, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  resultImage: { width: '100%', height: '100%' },
  resultHeaderInfo: { flex: 1, justifyContent: 'center' },
  resultEmoji: { fontSize: 40 },
  resultSpecies: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.extrabold, color: Colors.black },
  resultLocalName: { fontSize: Typography.sizes.sm, color: Colors.gray500, marginTop: 2 },
  pointsBadge: { backgroundColor: Colors.success, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginTop: Spacing.sm },
  pointsBadgeText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.white },
  resultContent: { gap: Spacing.sm },
  infoCard: { backgroundColor: Colors.gray100, borderRadius: BorderRadius.lg, padding: Spacing.md, borderLeftWidth: 4 },
  infoCardTitle: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoCardContent: { fontSize: Typography.sizes.md, color: Colors.gray600, lineHeight: 22 },
  retryButton: { borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.lg },
  retryButtonText: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.white },

  // ── Actions ──
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginHorizontal: Spacing.base, marginTop: Spacing.md },
  actionButton: { flex: 1, borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  actionText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.white },

  // ── Tips ──
  section: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.extrabold, color: Colors.black, marginBottom: Spacing.md },
  tipItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md, ...Shadows.sm },
  tipText: { fontSize: Typography.sizes.md, color: Colors.gray600, flex: 1 },
});