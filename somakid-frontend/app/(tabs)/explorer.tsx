import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Platform, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { EmptyState } from '../../components/ui/EmptyState';
import { takePhoto, pickFromGallery } from '../../utils/media';
import { formatPoints } from '../../utils/formatting';
import { aiEngineClient } from '../../services/api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
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

function AnalyzingAnimation({ t }: { t: (key: string) => string }) {
  const spinAnim = useRef(new Animated.Value(0)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const dotsAnim = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    dotsAnim.forEach((dot, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    return () => {
      spinAnim.stopAnimation();
      scanLineAnim.stopAnimation();
      dotsAnim.forEach(dot => dot.stopAnimation());
    };
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scanLine = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-55, 55],
  });

  return (
    <View style={az.stage}>
      <View style={az.orbContainer}>
        <View style={az.orbOuterRing} />
        <Animated.View style={[az.orbSpinRing, { transform: [{ rotate: spin }] }]}>
          <View style={[az.orbDot, { top: -4, left: '50%', marginLeft: -4 }]} />
          <View style={[az.orbDot, { bottom: -4, left: '50%', marginLeft: -4 }]} />
        </Animated.View>
        <Animated.View style={[az.orbSpinRing, { transform: [{ rotate: spin }, { scale: 0.7 }] }]}>
          <View style={[az.orbDotSmall, { top: -3, right: 12 }]} />
          <View style={[az.orbDotSmall, { bottom: -3, left: 12 }]} />
        </Animated.View>
        <View style={az.orbCore}>
          <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
            <Path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
          </Svg>
        </View>
        <Animated.View style={[az.scanLine, { transform: [{ translateY: scanLine }] }]}>
          <LinearGradient
            colors={['transparent', Colors.primary + '60', Colors.primary + 'C0', Colors.primary + '60', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={az.scanLineGradient}
          />
        </Animated.View>
      </View>
      <Text style={az.title}>{t('explorer.analyzing')}</Text>
      <View style={az.dotsRow}>
        {dotsAnim.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              az.dot,
              {
                opacity: dot,
                transform: [{ scale: dot }],
              },
            ]}
          />
        ))}
      </View>
      <Text style={az.subtitle}>{t('explorer.takePhoto')}</Text>
    </View>
  );
}

const az = StyleSheet.create({
  stage: {
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.white,
    padding: Spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
    ...Shadows.lg,
  },
  orbContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  orbOuterRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: Colors.primary + '20',
  },
  orbSpinRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  orbDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  orbDotSmall: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary + '80',
  },
  orbCore: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primary + '30',
  },
  scanLine: {
    position: 'absolute',
    width: 130,
    height: 3,
  },
  scanLineGradient: {
    flex: 1,
    borderRadius: 2,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.extrabold,
    color: Colors.black,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.gray500,
    textAlign: 'center',
  },
});

function SpeakingAnimation({ t }: { t: (key: string) => string }) {
  const waves = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0.4))).current;

  useEffect(() => {
    waves.forEach((wave, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(wave, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(wave, {
            toValue: 0.4,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
    return () => waves.forEach(wave => wave.stopAnimation());
  }, []);

  return (
    <View style={sz.stage}>
      <View style={sz.waveContainer}>
        {waves.map((wave, i) => (
          <Animated.View
            key={i}
            style={[
              sz.wave,
              {
                opacity: wave,
                transform: [{ scaleY: wave }],
                backgroundColor: i === 2 ? Colors.primary : Colors.primaryLight + '80',
              },
            ]}
          />
        ))}
      </View>
      <Text style={sz.title}>{t('explorer.speaking')}</Text>
    </View>
  );
}

const sz = StyleSheet.create({
  stage: {
    borderRadius: BorderRadius['2xl'],
    backgroundColor: Colors.successSurface,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    marginBottom: Spacing.md,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    marginBottom: Spacing.sm,
  },
  wave: {
    width: 5,
    height: 36,
    borderRadius: 3,
  },
  title: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.primaryDark,
  },
});

function InfoCard({ title, content, color, index }: { title: string; content: string; color: string; index: number }) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideRight = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(slideRight, {
        toValue: 0,
        tension: 80,
        friction: 10,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.infoCard,
      { borderLeftColor: color, opacity: fadeIn, transform: [{ translateX: slideRight }] },
    ]}>
      <Text style={[styles.infoCardTitle, { color }]}>{title}</Text>
      <Text style={styles.infoCardContent}>{content}</Text>
    </Animated.View>
  );
}

function ResultContent({ result, t }: { result: ImageAnalysisResult; t: (key: string) => string }) {
  const cards = [
    { title: t('explorer.about'), content: result.childDescription, color: Colors.primary, show: !!result.childDescription },
    { title: t('explorer.roleInNature'), content: result.ecologicalRole, color: Colors.secondary, show: !!result.ecologicalRole },
    { title: t('explorer.didYouKnowTitle'), content: result.funFact, color: Colors.modules.quiz, show: !!result.funFact },
    { title: t('explorer.threats'), content: result.threats, color: Colors.earth, show: !!result.threats },
    { title: t('explorer.whatYouCanDo'), content: result.childAction, color: Colors.modules.chat, show: !!result.childAction },
    { title: t('explorer.safetyAdvice'), content: result.safetyAdvice, color: Colors.danger, show: !!result.safetyAdvice },
  ].filter(card => card.show);

  return (
    <View style={styles.resultContent}>
      {cards.map((card, index) => (
        <InfoCard key={index} title={card.title} content={card.content!} color={card.color} index={index} />
      ))}
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

  const clearResult = useCallback(() => { setResult(null); setImageUri(null); setError(null); }, []);

  const handleImageAnalysis = useCallback(async (uri: string) => {
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
      setIsAnalyzing(false);
    }
  }, [activeChild, t]);

  const handleTakePhoto = useCallback(async () => { const uri = await takePhoto(); if (uri) handleImageAnalysis(uri); }, [handleImageAnalysis]);
  const handlePickGallery = useCallback(async () => { const uri = await pickFromGallery(); if (uri) handleImageAnalysis(uri); }, [handleImageAnalysis]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]} 
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <LinearGradient colors={[Colors.gradients.heroStart, Colors.gradients.heroMiddle]} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
                <Path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
              </Svg>
            </View>
            <View>
              <Text style={styles.headerTitle}>{t('explorer.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('explorer.subtitle')}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.mainArea}>
          {isAnalyzing && <AnalyzingAnimation t={t} />}
          {isSpeaking && <SpeakingAnimation t={t} />}
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

          {!isAnalyzing && !error && !result && (
            <EmptyState
              emoji="📸"
              title={t('explorer.takePhoto')}
              description={t('explorer.takePhotoDesc')}
            />
          )}
        </View>

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
  header: { padding: Spacing.xl, paddingTop: Spacing.lg },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerIconContainer: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
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
  resultLocalName: { fontSize: Typography.sizes.sm, color: Colors.gray500, marginTop: 2 },
  pointsBadge: { backgroundColor: Colors.success, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: BorderRadius.full, alignSelf: 'flex-start', marginTop: Spacing.sm },
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
  section: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.extrabold, color: Colors.black, marginBottom: Spacing.md },
  tipItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md, ...Shadows.sm },
  tipText: { fontSize: Typography.sizes.md, color: Colors.gray600, flex: 1 },
});