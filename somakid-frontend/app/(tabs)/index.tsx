/**
 * SOMAKID AI - Home Screen
 * Main dashboard with hero banner, progress stats, learning paths, and module navigation.
 * Inspired by Duolingo - includes structured learning paths with progress tracking.
 * Full i18n integration with instant language switching.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { LanguageSelector } from '../../components/ui/LanguageSelector';
import { ModuleCard, StatCard } from '../../components/modules';
import { formatPoints } from '../../utils/formatting';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import { LEVEL_EMOJIS, LEVEL_TITLES } from '../../types/domain.types';
import Svg, { Path, Circle } from 'react-native-svg';
import { getCurrentLanguage, getLanguageInfo } from '../../i18n';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

function HeroBanner({
  firstName,
  level,
  points,
  title,
  streakDays,
  t,
}: {
  firstName: string;
  level: number;
  points: number;
  title: string;
  streakDays: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const levelEmoji = LEVEL_EMOJIS[level] || '🌱';

  return (
    <Animated.View style={[styles.heroWrapper, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
      <LinearGradient
        colors={[Colors.gradients.heroStart, Colors.gradients.heroMiddle, Colors.gradients.heroEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBanner}
      >
        <View style={styles.heroDecoration1} />
        <View style={styles.heroDecoration2} />
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroGreeting}>{t('home.hello')}</Text>
            <Text style={styles.heroName}>{firstName}!</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profil')} style={styles.avatarButton} activeOpacity={0.8}>
            <Text style={styles.avatarEmoji}>{levelEmoji}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{level}</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.heroBottom}>
          <Text style={styles.heroTitle}>{levelEmoji} {title}</Text>
          <View style={styles.heroRow}>
            <Text style={styles.pointsText}>{formatPoints(points)} {t('common.points')}</Text>
            {streakDays > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakIcon}>🔥</Text>
                <Text style={styles.streakText}>{streakDays}</Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function LearningPathCard({
  emoji,
  title,
  description,
  color,
  progress,
  totalUnits,
  onPress,
}: {
  emoji: string;
  title: string;
  description: string;
  color: string;
  progress: number;
  totalUnits: number;
  onPress: () => void;
}) {
  const progressPercent = totalUnits > 0 ? Math.round((progress / totalUnits) * 100) : 0;
  const animProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animProgress, { toValue: progressPercent, duration: 800, useNativeDriver: false }).start();
  }, [progressPercent]);

  const progressWidth = animProgress.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

  return (
    <TouchableOpacity style={[styles.pathCard, Shadows.md]} onPress={onPress} activeOpacity={0.9}>
      <LinearGradient colors={[color, color + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.pathCardGradient}>
        <View style={styles.pathCardGlow} />
        <View style={styles.pathCardHeader}>
          <View style={[styles.pathEmojiContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Text style={styles.pathEmoji}>{emoji}</Text>
          </View>
          <View style={[styles.pathProgressBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={styles.pathProgressText}>{progressPercent}%</Text>
          </View>
        </View>
        <Text style={styles.pathTitle}>{title}</Text>
        <Text style={styles.pathDescription} numberOfLines={2}>{description}</Text>
        <View style={styles.pathProgressBar}>
          <Animated.View style={[styles.pathProgressFill, { width: progressWidth, backgroundColor: 'rgba(255,255,255,0.5)' }]} />
        </View>
        <View style={styles.pathFooter}>
          <Text style={styles.pathUnitsText}>{progress}/{totalUnits} unités</Text>
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M5 12h14M12 5l7 7-7 7" />
          </Svg>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { childName, childLevel, childPoints, childTitle, activeChild } = useAuth();
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLanguageChanged = useCallback((lang: string) => { setCurrentLang(lang); setRefreshKey(prev => prev + 1); }, []);
  const handleCloseLanguageSelector = useCallback(() => { setShowLanguageSelector(false); setCurrentLang(getCurrentLanguage()); }, []);

  const speciesCount = activeChild?.speciesDiscovered?.length ?? 0;
  const quizzesDone = activeChild?.quizzesCompleted ?? 0;
  const badgesCount = activeChild?.badges?.length ?? 0;
  const streakDays = 0;
  const languageInfo = getLanguageInfo(currentLang);

  const learningPaths = [
    { emoji: '🌿', title: t('home.biodiversity'), description: t('home.biodiversityPathDesc'), color: Colors.modules.explorer, progress: 1, totalUnits: 5, route: '/(tabs)/learn' as const, params: { pathId: 'biodiversity' } },
    { emoji: '🌍', title: t('home.climate'), description: t('home.climatePathDesc'), color: '#1B6CA8', progress: 0, totalUnits: 5, route: '/(tabs)/learn' as const, params: { pathId: 'climate' } },
    { emoji: '⛈️', title: t('home.disasters'), description: t('home.disastersDesc'), color: '#C0392B', progress: 0, totalUnits: 5, route: '/(tabs)/learn' as const, params: { pathId: 'disasters' } },
    { emoji: '♻️', title: t('home.behaviors'), description: t('home.behaviorsDesc'), color: '#8B5CF6', progress: 0, totalUnits: 5, route: '/(tabs)/learn' as const, params: { pathId: 'behaviors' } },
  ];

  const quickModules = [
    {
      title: t('home.biodiversityExplorer'), description: t('home.biodiversityExplorerDesc'), color: Colors.modules.explorer, route: '/(tabs)/explorer' as const,
      icon: (<Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" /><Path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /></Svg>),
    },
    {
      title: t('home.talkWithSoma'), description: t('home.talkWithSomaDesc'), color: Colors.modules.chat, route: '/(tabs)/chat' as const,
      icon: (<Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></Svg>),
    },
    {
      title: t('courses.entryTitle'), description: t('courses.entryDesc'), color: Colors.modules.courses, route: '/screens/courses' as const,
      icon: (<Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" /><Path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5" /></Svg>),
    },
    {
      title: t('library.entryTitle'), description: t('library.entryDesc'), color: Colors.modules.library, route: '/screens/library' as const,
      icon: (<Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></Svg>),
    },
    {
      title: t('institutions.entryTitle'), description: t('institutions.entryDesc'), color: Colors.modules.institutions, route: '/screens/institutions' as const,
      icon: (<Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M3 21h18" /><Path d="M5 21V7l7-4 7 4v14" /><Path d="M9 21v-6h6v6" /></Svg>),
    },
    {
      title: t('myLearning.entryTitle'), description: t('myLearning.entryDesc'), color: Colors.modules.myLearning, route: '/screens/my-learning' as const,
      icon: (<Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 2l2.9 6.4 6.9.9-5 4.9 1.2 6.9-6-3.3-6 3.3 1.2-6.9-5-4.9 6.9-.9z" /></Svg>),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView key={refreshKey} contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]} showsVerticalScrollIndicator={false} bounces={true}>
        <View style={styles.headerBar}>
          <View style={styles.headerLogo}>
            <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.headerLogoBadge}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" /><Path d="M2 12h20" /><Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </Svg>
            </LinearGradient>
            <Text style={styles.headerAppName}>SOMAKID</Text>
          </View>
          <TouchableOpacity style={styles.languageButton} onPress={() => setShowLanguageSelector(true)} activeOpacity={0.7}>
            <Text style={styles.languageFlag}>{languageInfo?.flag || '🌍'}</Text>
            <Text style={styles.languageCode}>{languageInfo?.code.toUpperCase() || 'FR'}</Text>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.gray500} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M6 9l6 6 6-6" /></Svg>
          </TouchableOpacity>
        </View>

        <View style={styles.heroContainer}>
          <HeroBanner firstName={childName} level={childLevel} points={childPoints} title={childTitle} streakDays={streakDays} t={t} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.myProgress')}</Text>
          <View style={styles.statsRow}>
            <StatCard label={t('home.species')} value={speciesCount} emoji="🌿" color={Colors.modules.explorer} />
            <StatCard label={t('home.quizzes')} value={quizzesDone} emoji="⚡" color={Colors.modules.quiz} />
            <StatCard label={t('home.badges')} value={badgesCount} emoji="🏅" color={Colors.accent} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.learningPaths')}</Text>
          <Text style={styles.sectionSubtitle}>{t('home.learningPathsDesc')}</Text>
          {learningPaths.map((path, index) => (
            <LearningPathCard key={index} emoji={path.emoji} title={path.title} description={path.description} color={path.color} progress={path.progress} totalUnits={path.totalUnits}
              onPress={() => router.push({ pathname: path.route, params: path.params } as any)} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.quickAccess')}</Text>
          {quickModules.map((module, index) => (
            <TouchableOpacity key={index} style={[styles.moduleCard, Shadows.md]} onPress={() => router.push(module.route)} activeOpacity={0.9}>
              <LinearGradient colors={[module.color, module.color + 'DD']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.moduleGradient}>
                <View style={styles.moduleIconContainer}>{module.icon}</View>
                <View style={styles.moduleTextContainer}>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleDescription}>{module.description}</Text>
                </View>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M9 18l6-6-6-6" /></Svg>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.dailyFact, Shadows.md]}>
          <Svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" /><Path d="M12 2v4" /><Path d="M12 18v4" /><Path d="M4.93 4.93l2.83 2.83" /><Path d="M16.24 16.24l2.83 2.83" /><Path d="M2 12h4" /><Path d="M18 12h4" /><Path d="M4.93 19.07l2.83-2.83" /><Path d="M16.24 7.76l2.83-2.83" />
          </Svg>
          <View style={styles.dailyFactContent}>
            <Text style={styles.dailyFactTitle}>{t('home.didYouKnow')}</Text>
            <Text style={styles.dailyFactText}>{t('home.dailyFact')}</Text>
          </View>
        </View>
      </ScrollView>
      <LanguageSelector isVisible={showLanguageSelector} onClose={handleCloseLanguageSelector} onLanguageChanged={handleLanguageChanged} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scrollContent: { flexGrow: 1 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  headerLogo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerLogoBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerAppName: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.extrabold, color: Colors.black, letterSpacing: 1 },
  languageButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.xs, borderWidth: 1, borderColor: Colors.gray200, ...Shadows.sm },
  languageFlag: { fontSize: 18 },
  languageCode: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.gray700 },
  heroContainer: { paddingHorizontal: Spacing.base, paddingTop: Spacing.sm },
  heroWrapper: { borderRadius: BorderRadius['2xl'], overflow: 'hidden' },
  heroBanner: { borderRadius: BorderRadius['2xl'], padding: Spacing.xl, minHeight: 180, overflow: 'hidden' },
  heroDecoration1: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)', top: -30, right: -20 },
  heroDecoration2: { position: 'absolute', width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.04)', bottom: 10, left: width * 0.4 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.lg },
  heroGreeting: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.75)', fontWeight: Typography.weights.medium },
  heroName: { fontSize: Typography.sizes['3xl'], color: Colors.white, fontWeight: Typography.weights.extrabold, letterSpacing: -0.5 },
  avatarButton: { position: 'relative' },
  avatarEmoji: { fontSize: 48 },
  levelBadge: { position: 'absolute', bottom: 0, right: -4, backgroundColor: Colors.accent, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.primary },
  levelBadgeText: { fontSize: 11, fontWeight: Typography.weights.extrabold, color: Colors.white },
  heroBottom: { gap: 6 },
  heroTitle: { fontSize: Typography.sizes.base, color: 'rgba(255,255,255,0.9)', fontWeight: Typography.weights.semibold },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pointsText: { fontSize: Typography.sizes.sm, color: Colors.accentLight, fontWeight: Typography.weights.bold },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, gap: 4 },
  streakIcon: { fontSize: 12 },
  streakText: { fontSize: Typography.sizes.xs, color: Colors.white, fontWeight: Typography.weights.bold },
  section: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.extrabold, color: Colors.black, marginBottom: Spacing.xs, letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: Typography.sizes.sm, color: Colors.gray500, marginBottom: Spacing.md, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },

  // ── Learning Path Cards (redesign) ──
  pathCard: { borderRadius: BorderRadius['2xl'], overflow: 'hidden', marginBottom: Spacing.md, ...Shadows.lg },
  pathCardGradient: { padding: Spacing.lg, gap: Spacing.sm, minHeight: 150, position: 'relative', overflow: 'hidden' },
  pathCardGlow: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -40 },
  pathCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pathEmojiContainer: { width: 52, height: 52, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  pathEmoji: { fontSize: 30 },
  pathProgressBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  pathProgressText: { fontSize: 13, fontWeight: '800', color: Colors.white },
  pathTitle: { fontSize: 18, fontWeight: '800', color: Colors.white, letterSpacing: -0.3 },
  pathDescription: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  pathProgressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  pathProgressFill: { height: '100%', borderRadius: 2 },
  pathFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pathUnitsText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

  // ── Quick Modules ──
  moduleCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.base },
  moduleGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: Spacing.md },
  moduleIconContainer: { width: 56, height: 56, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  moduleTextContainer: { flex: 1, gap: 4 },
  moduleTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.white },
  moduleDescription: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },

  // ── Daily Fact ──
  dailyFact: { flexDirection: 'row', backgroundColor: Colors.white, borderRadius: BorderRadius.xl, marginHorizontal: Spacing.base, marginTop: Spacing.xl, marginBottom: Spacing.xl, padding: Spacing.base, gap: Spacing.md, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  dailyFactContent: { flex: 1 },
  dailyFactTitle: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.primary, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  dailyFactText: { fontSize: Typography.sizes.sm, color: Colors.gray600, lineHeight: 20 },
});