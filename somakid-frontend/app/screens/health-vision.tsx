/**
 * SOMAKID AI - Health Vision Screen
 * Photo/gallery recognition of food, hygiene products and first-aid items.
 * Mirrors the Explorer screen's structure, posting domain='health' to /vision/analyze.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { EmptyState } from '../../components/ui/EmptyState';
import { takePhoto, pickFromGallery, playAudioBase64, stopCurrentAudio } from '../../utils/media';
import { formatPoints } from '../../utils/formatting';
import { aiEngineClient } from '../../services/api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { getCurrentLanguage } from '../../i18n';
import type { ImageAnalysisResult } from '../../types/api.types';
import Svg, { Path, Circle } from 'react-native-svg';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;
const HEALTH_COLOR = Colors.modules.health;

async function speakViaTTS(text: string, langue: string = 'fr'): Promise<void> {
  if (!text || text.trim().length < 3) return;
  try {
    const res = await aiEngineClient.post('/voice/synthesize-direct', { texte: text.trim(), langue });
    const audioB64: string = res.data?.data?.audio_base64 ?? '';
    if (audioB64 && audioB64.length > 100) await playAudioBase64(audioB64);
  } catch (error) {
    console.warn('[HealthVision TTS] Error:', error);
  }
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
  const cards = [
    { title: t('explorer.about'), content: result.childDescription, color: HEALTH_COLOR, show: !!result.childDescription },
    { title: t('explorer.roleInNature'), content: result.ecologicalRole, color: Colors.secondary, show: !!result.ecologicalRole },
    { title: t('explorer.didYouKnowTitle'), content: result.funFact, color: Colors.modules.quiz, show: !!result.funFact },
    { title: t('explorer.whatYouCanDo'), content: result.childAction, color: Colors.modules.chat, show: !!result.childAction },
    { title: t('explorer.safetyAdvice'), content: result.safetyAdvice, color: Colors.danger, show: !!result.safetyAdvice },
  ].filter((card) => card.show);

  return (
    <View style={styles.resultContent}>
      {cards.map((card, index) => (
        <InfoCard key={index} title={card.title} content={card.content!} color={card.color} />
      ))}
    </View>
  );
}

export default function HealthVisionScreen() {
  const { t } = useTranslation();
  const { activeChild } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { stopCurrentAudio(); }, []);

  const clearResult = useCallback(async () => {
    await stopCurrentAudio();
    setResult(null);
    setImageUri(null);
    setError(null);
  }, []);

  const handleImageAnalysis = useCallback(async (uri: string) => {
    await stopCurrentAudio();
    setImageUri(uri);
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    const currentLang = getCurrentLanguage();

    try {
      const formData = new FormData();
      formData.append('image', { uri, type: 'image/jpeg', name: 'photo.jpg' } as any);
      formData.append('language', currentLang);
      formData.append('child_age', String(activeChild?.age ?? 8));
      formData.append('domain', 'health');

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
        emoji: data?.emoji || '🩺',
        dangerLevel: data?.dangerLevel || data?.niveau_danger || 'none',
        safetyAdvice: data?.safetyAdvice || data?.conseils_securite || null,
        pointsEarned: data?.pointsEarned || data?.points_gagnes || 10,
        guardianTitle: data?.guardianTitle || data?.titre_gardien || null,
        confidence: data?.confidence || data?.confiance || null,
      };

      setResult(mappedResult);

      const textToSpeak = `${mappedResult.species}. ${mappedResult.childDescription} ${mappedResult.ecologicalRole} ${mappedResult.funFact} ${mappedResult.childAction}`.trim();
      if (textToSpeak.length > 5) await speakViaTTS(textToSpeak, currentLang);
    } catch {
      setError(t('explorer.analysisError'));
    } finally {
      setIsAnalyzing(false);
    }
  }, [activeChild, t]);

  const handleTakePhoto = useCallback(async () => {
    const uri = await takePhoto();
    if (uri) handleImageAnalysis(uri);
  }, [handleImageAnalysis]);

  const handlePickGallery = useCallback(async () => {
    const uri = await pickFromGallery();
    if (uri) handleImageAnalysis(uri);
  }, [handleImageAnalysis]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[HEALTH_COLOR, HEALTH_COLOR + 'CC']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <Text style={styles.headerIconEmoji}>🩺</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>{t('health.healthVisionTitle')}</Text>
              <Text style={styles.headerSubtitle}>{t('health.healthVisionSubtitle')}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.mainArea}>
          {isAnalyzing && <LoadingSpinner message={t('explorer.analyzing')} color={HEALTH_COLOR} />}
          {error && !isAnalyzing && <ErrorDisplay message={error} onRetry={clearResult} />}

          {result && !isAnalyzing && !error && (
            <View style={styles.resultContainer}>
              <View style={styles.resultHeader}>
                <View style={styles.resultImageContainer}>
                  {imageUri && <Image source={{ uri: imageUri }} style={styles.resultImage} contentFit="cover" />}
                </View>
                <View style={styles.resultHeaderInfo}>
                  <Text style={styles.resultEmoji}>{result.emoji}</Text>
                  <Text style={styles.resultSpecies}>{result.species}</Text>
                  <View style={[styles.pointsBadge, { backgroundColor: HEALTH_COLOR }]}>
                    <Text style={styles.pointsBadgeText}>+{formatPoints(result.pointsEarned)} {t('common.points')}</Text>
                  </View>
                </View>
              </View>
              <ResultContent result={result} t={t} />
              <TouchableOpacity style={[styles.retryButton, { backgroundColor: HEALTH_COLOR }]} onPress={clearResult} activeOpacity={0.85}>
                <Text style={styles.retryButtonText}>{t('explorer.exploreAgain')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isAnalyzing && !error && !result && (
            <EmptyState emoji="📸" title={t('explorer.takePhoto')} description={t('health.healthVisionTip')} />
          )}
        </View>

        {!isAnalyzing && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: HEALTH_COLOR }, Shadows.colored(HEALTH_COLOR)]} onPress={handleTakePhoto} disabled={isAnalyzing} activeOpacity={0.8}>
              <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <Circle cx="12" cy="13" r="4" />
              </Svg>
              <Text style={styles.actionText}>{t('explorer.camera')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: Colors.secondary }, Shadows.colored(Colors.secondary)]} onPress={handlePickGallery} disabled={isAnalyzing} activeOpacity={0.8}>
              <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <Path d="M7 10l5 5 5-5" />
                <Path d="M12 15V3" />
              </Svg>
              <Text style={styles.actionText}>{t('explorer.gallery')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scroll: { flexGrow: 1 },
  header: { padding: Spacing.xl, paddingTop: Spacing.lg, gap: Spacing.md },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerIconContainer: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerIconEmoji: { fontSize: 26 },
  headerTitle: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, color: Colors.white, marginBottom: 4 },
  headerSubtitle: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.8)' },
  mainArea: { margin: Spacing.base, minHeight: 250 },
  resultContainer: { backgroundColor: Colors.white, borderRadius: BorderRadius['2xl'], padding: Spacing.xl, ...Shadows.md },
  resultHeader: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  resultImageContainer: { width: 120, height: 120, borderRadius: BorderRadius.xl, overflow: 'hidden' },
  resultImage: { width: '100%', height: '100%' },
  resultHeaderInfo: { flex: 1, justifyContent: 'center' },
  resultEmoji: { fontSize: 40 },
  resultSpecies: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.extrabold, color: Colors.black },
  pointsBadge: { paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginTop: Spacing.sm },
  pointsBadgeText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.white },
  resultContent: { gap: Spacing.sm },
  infoCard: { backgroundColor: Colors.gray100, borderRadius: BorderRadius.lg, padding: Spacing.md, borderLeftWidth: 4 },
  infoCardTitle: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoCardContent: { fontSize: Typography.sizes.md, color: Colors.gray600, lineHeight: 22 },
  retryButton: { borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.lg },
  retryButtonText: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.white },
  actionRow: { flexDirection: 'row', gap: Spacing.md, marginHorizontal: Spacing.base, marginTop: Spacing.md },
  actionButton: { flex: 1, borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  actionText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.white },
});
