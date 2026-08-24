/**
 * SOMAKID AI - Health Module Home Screen
 * Categories grid, progression summary, daily challenge, and quick actions
 * for the Sante module. Mirrors the Learn/Explorer screens' visual language.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { ReminderCard } from '../../components/ui/ReminderCard';
import { aiEngineClient } from '../../services/api/client';
import { getCurrentLanguage } from '../../i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import Svg, { Path } from 'react-native-svg';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;
const HEALTH_COLOR = Colors.modules.health;

interface HealthCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  total_units: number;
}

interface HealthChallenge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  points: number;
  progress: number;
  target_value: number;
  completed: boolean;
}

interface HealthSummary {
  lessons_completed: number;
  quiz_completed: number;
  points: number;
  badges: Array<{ id: string; name: string; emoji: string }>;
}

function CategoryCard({ category, t, onPress }: { category: HealthCategory; t: (k: string) => string; onPress: () => void }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={[styles.categoryCardWrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.96, tension: 120, friction: 10, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }).start()}
        onPress={onPress}
      >
        <View style={[styles.categoryCard, Shadows.sm]}>
          <View style={[styles.categoryEmojiContainer, { backgroundColor: category.color + '18' }]}>
            <Text style={styles.categoryEmoji}>{category.emoji}</Text>
          </View>
          <Text style={styles.categoryName} numberOfLines={2}>{category.name}</Text>
          <Text style={[styles.categoryCta, { color: category.color }]}>{t('health.exploreCategory')}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function HealthScreen() {
  const { t } = useTranslation();
  const { activeChild } = useAuth();

  const [categories, setCategories] = useState<HealthCategory[]>([]);
  const [challenge, setChallenge] = useState<HealthChallenge | null>(null);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const lang = getCurrentLanguage();
      const [pathsRes, challengesRes] = await Promise.all([
        aiEngineClient.get('/learning/paths', { params: { language: lang, domain: 'health' } }),
        aiEngineClient.get('/sante/challenges', {
          params: { language: lang, ...(activeChild?.id ? { child_id: activeChild.id } : {}) },
        }),
      ]);
      setCategories(pathsRes.data?.data || []);
      const challenges: HealthChallenge[] = challengesRes.data?.data || [];
      setChallenge(challenges.find((c) => !c.completed) || challenges[0] || null);

      if (activeChild?.id) {
        const summaryRes = await aiEngineClient.get(`/sante/challenges/${activeChild.id}/summary`);
        setSummary(summaryRes.data?.data || null);
      }
    } catch {
      setError(t('health.errorLoadingCategories'));
    } finally {
      setIsLoading(false);
    }
  }, [activeChild, t]);

  useEffect(() => {
    loadData();
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [loadData]);

  const handleCategoryPress = useCallback((category: HealthCategory) => {
    router.push({ pathname: '/screens/learning-path', params: { pathId: category.slug } } as any);
  }, []);

  const handleAskSoma = useCallback(() => {
    router.push({ pathname: '/(tabs)/chat', params: { domain: 'health' } } as any);
  }, []);

  const handleHealthVision = useCallback(() => {
    router.push('/screens/health-vision' as any);
  }, []);

  const reminderTips = [t('health.reminderWater'), t('health.reminderHands'), t('health.reminderTeeth'), t('health.reminderChallenge')];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]}
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
              <Text style={styles.headerEmoji}>🩺</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>{t('health.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('health.subtitle')}</Text>
            </View>
          </View>
        </LinearGradient>

        <ReminderCard tips={reminderTips} color={HEALTH_COLOR} emoji="💡" />

        {summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('health.myProgress')}</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statCard, Shadows.sm]}>
                <Text style={styles.statValue}>{summary.lessons_completed}</Text>
                <Text style={styles.statLabel}>{t('health.lessonsCompleted')}</Text>
              </View>
              <View style={[styles.statCard, Shadows.sm]}>
                <Text style={styles.statValue}>{summary.points}</Text>
                <Text style={styles.statLabel}>{t('health.points')}</Text>
              </View>
              <View style={[styles.statCard, Shadows.sm]}>
                <Text style={styles.statValue}>{summary.badges?.length || 0}</Text>
                <Text style={styles.statLabel}>{t('health.badges')}</Text>
              </View>
            </View>
          </View>
        )}

        {challenge && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('health.dailyChallenge')}</Text>
            <View style={[styles.challengeCard, Shadows.md]}>
              <LinearGradient colors={[HEALTH_COLOR, HEALTH_COLOR + 'BB']} style={styles.challengeGradient}>
                <Text style={styles.challengeEmoji}>{challenge.emoji}</Text>
                <View style={styles.challengeText}>
                  <Text style={styles.challengeTitle} numberOfLines={2}>{challenge.title}</Text>
                  <Text style={styles.challengeDesc} numberOfLines={2}>{challenge.description}</Text>
                  <View style={styles.challengeProgressBar}>
                    <View style={[styles.challengeProgressFill, { width: `${Math.min(100, Math.round((challenge.progress / challenge.target_value) * 100))}%` }]} />
                  </View>
                </View>
              </LinearGradient>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('health.categories')}</Text>
          {isLoading ? (
            <LoadingSpinner message={t('common.loading')} color={HEALTH_COLOR} />
          ) : error ? (
            <ErrorDisplay message={error} onRetry={loadData} />
          ) : (
            <View style={styles.categoriesGrid}>
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} t={t} onPress={() => handleCategoryPress(category)} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={[styles.actionCard, Shadows.md]} onPress={handleAskSoma} activeOpacity={0.9}>
            <LinearGradient colors={[Colors.modules.chat, Colors.modules.chat + 'DD']} style={styles.actionGradient}>
              <Text style={styles.actionEmoji}>💬</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>{t('health.askSoma')}</Text>
                <Text style={styles.actionDesc}>{t('health.askSomaDesc')}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, Shadows.md]} onPress={handleHealthVision} activeOpacity={0.9}>
            <LinearGradient colors={[Colors.modules.explorer, Colors.modules.explorer + 'DD']} style={styles.actionGradient}>
              <Text style={styles.actionEmoji}>📸</Text>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>{t('health.healthVision')}</Text>
                <Text style={styles.actionDesc}>{t('health.healthVisionDesc')}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scrollContent: { flexGrow: 1 },
  header: { padding: Spacing.xl, paddingTop: Spacing.lg, gap: Spacing.md },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerIconContainer: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerEmoji: { fontSize: 26 },
  headerTitle: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, color: Colors.white, marginBottom: 2 },
  headerSubtitle: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.85)' },
  section: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.extrabold, color: Colors.black, marginBottom: Spacing.md },
  statsRow: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', gap: 4 },
  statValue: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, color: HEALTH_COLOR },
  statLabel: { fontSize: Typography.sizes.xs, color: Colors.gray500, fontWeight: Typography.weights.medium },
  challengeCard: { borderRadius: BorderRadius['2xl'], overflow: 'hidden' },
  challengeGradient: { flexDirection: 'row', padding: Spacing.lg, gap: Spacing.md, alignItems: 'center' },
  challengeEmoji: { fontSize: 36 },
  challengeText: { flex: 1, gap: 6 },
  challengeTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.white },
  challengeDesc: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
  challengeProgressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden', marginTop: 4 },
  challengeProgressFill: { height: '100%', backgroundColor: Colors.white, borderRadius: 3 },
  categoriesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'space-between' },
  categoryCardWrapper: { width: '48%' },
  categoryCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.md, alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  categoryEmojiContainer: { width: 56, height: 56, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  categoryEmoji: { fontSize: 30 },
  categoryName: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.black, textAlign: 'center', minHeight: 34 },
  categoryCta: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  actionCard: { borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.md },
  actionGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: Spacing.md },
  actionEmoji: { fontSize: 30 },
  actionText: { flex: 1, gap: 2 },
  actionTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.white },
  actionDesc: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },
});
