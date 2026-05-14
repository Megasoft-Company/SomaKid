/**
 * SOMAKID AI - Learning Path Screen
 * Detailed view of a learning path with all units and progress.
 * Shows unit completion status, test results, and overall progress.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
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
import { router, useLocalSearchParams, Stack, usePathname } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatPoints } from '../../utils/formatting';
import { aiEngineClient } from '../../services/api/client';
import { getCurrentLanguage } from '../../i18n';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import Svg, { Path, Circle } from 'react-native-svg';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 83 : 64;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

// =============================================================================
// BottomTabBar — mirrors the (tabs) navigator appearance
// =============================================================================

function BottomTabBar({ t }: { t: (key: string) => string }) {
  const pathname = usePathname();

  const tabs = [
    {
      key: 'home',
      label: t('nav.home'),
      route: '/(tabs)/',
      icon: (active: boolean) => (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"
          stroke={active ? Colors.primary : Colors.gray400}
          strokeWidth={active ? 2.5 : 2}
          strokeLinecap="round" strokeLinejoin="round">
          <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <Path d="M9 22V12h6v10" />
        </Svg>
      ),
    },
    {
      key: 'learn',
      label: t('nav.learn'),
      route: '/(tabs)/learn',
      icon: (active: boolean) => (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"
          stroke={active ? Colors.primary : Colors.gray400}
          strokeWidth={active ? 2.5 : 2}
          strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
          <Path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
        </Svg>
      ),
    },
    {
      key: 'quiz',
      label: t('nav.quiz'),
      route: '/(tabs)/quiz',
      icon: (active: boolean) => (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"
          stroke={active ? Colors.primary : Colors.gray400}
          strokeWidth={active ? 2.5 : 2}
          strokeLinecap="round" strokeLinejoin="round">
          <Path d="M9 11l3 3L22 4" />
          <Path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </Svg>
      ),
    },
    {
      key: 'profile',
      label: t('nav.profile'),
      route: '/(tabs)/profile',
      icon: (active: boolean) => (
        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none"
          stroke={active ? Colors.primary : Colors.gray400}
          strokeWidth={active ? 2.5 : 2}
          strokeLinecap="round" strokeLinejoin="round">
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <Circle cx="12" cy="7" r="4" />
        </Svg>
      ),
    },
  ];

  return (
    <View style={tabStyles.container}>
      <View style={tabStyles.bar}>
        {tabs.map((tab) => {
          // Highlight "learn" since we're in a learning sub-screen
          const active =
            tab.key === 'learn' ||
            pathname.includes(tab.key === 'home' ? '/(tabs)/' : tab.key);
          return (
            <TouchableOpacity
              key={tab.key}
              style={tabStyles.tab}
              onPress={() => router.push(tab.route as any)}
              activeOpacity={0.7}
            >
              {tab.icon(active)}
              <Text style={[tabStyles.label, active && tabStyles.labelActive]}>
                {tab.label}
              </Text>
              {active && <View style={tabStyles.indicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    paddingBottom: Platform.OS === 'ios' ? 28 : BOTTOM_SAFE_AREA,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  bar: {
    flexDirection: 'row',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray400,
  },
  labelActive: {
    color: Colors.primary,
  },
  indicator: {
    position: 'absolute',
    top: -10,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});

// =============================================================================
// Types
// =============================================================================

interface PathDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  total_units: number;
  child_progress?: {
    total_lessons_completed: number;
    total_units_completed: number;
    total_tests_passed: number;
    total_points_earned: number;
    streak_days: number;
    overall_progress: number;
  };
}

interface UnitDetail {
  id: string;
  unit_number: number;
  name: string;
  description: string;
  total_lessons: number;
  required_score: number;
  is_locked: boolean;
  is_completed: boolean;
  test_passed: boolean;
  lessons_completed: number;
  best_score?: number;
}

// =============================================================================
// Progress Circle Component
// =============================================================================

function ProgressCircle({
  progress,
  size = 120,
  strokeWidth = 10,
  color = Colors.primary,
  emoji = '🌿',
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  emoji?: string;
}) {
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.progressCircle, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={Colors.gray200}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={styles.progressCircleContent}>
        <Text style={styles.progressEmoji}>{emoji}</Text>
        <Text style={[styles.progressPercent, { color }]}>{Math.round(progress)}%</Text>
      </View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// =============================================================================
// Unit Row Component
// =============================================================================

function UnitRow({
  unit,
  color,
  isLast,
  onPress,
  t,
}: {
  unit: UnitDetail;
  color: string;
  isLast: boolean;
  onPress: () => void;
  t: (key: string) => string;
}) {
  const statusIcon = unit.is_completed && unit.test_passed ? (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill={Colors.success} stroke={Colors.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <Path d="M22 4L12 14.01l-3-3" />
    </Svg>
  ) : unit.is_completed && !unit.test_passed ? (
    <View style={[styles.statusDot, { backgroundColor: Colors.accent }]} />
  ) : unit.is_locked ? (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.gray400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  ) : (
    <View style={[styles.statusDot, { backgroundColor: color }]} />
  );

  return (
    <TouchableOpacity
      style={[
        styles.unitRow,
        unit.is_locked && styles.unitRowLocked,
      ]}
      onPress={onPress}
      disabled={unit.is_locked}
      activeOpacity={0.8}
    >
      <View style={styles.unitRowLeft}>
        <View style={[styles.unitStatusContainer, { borderColor: unit.is_locked ? Colors.gray300 : color }]}>
          {statusIcon}
        </View>
        {!isLast && (
          <View
            style={[
              styles.unitRowLine,
              { backgroundColor: unit.is_completed ? Colors.success : Colors.gray200 },
            ]}
          />
        )}
      </View>

      <View style={[styles.unitRowCard, Shadows.sm]}>
        <LinearGradient
          colors={
            unit.is_locked
              ? [Colors.gray200, Colors.gray300]
              : unit.is_completed && unit.test_passed
              ? [Colors.successSurface, Colors.white]
              : [Colors.white, Colors.gray100]
          }
          style={styles.unitRowGradient}
        >
          <View style={styles.unitRowHeader}>
            <Text style={[styles.unitRowNumber, { color }]}>{t('learn.unit')} {unit.unit_number}</Text>
            <View style={styles.unitRowLessons}>
              <Text style={styles.unitRowLessonsText}>
                {unit.lessons_completed}/{unit.total_lessons} {t('learn.lessons')}
              </Text>
            </View>
          </View>
          <Text style={[styles.unitRowName, unit.is_locked && { color: Colors.gray500 }]}>
            {unit.name}
          </Text>
          {unit.best_score !== undefined && unit.best_score > 0 && (
            <Text style={styles.unitRowScore}>
              {t('learn.bestScore')}: {unit.best_score}%
            </Text>
          )}
          {unit.is_completed && !unit.test_passed && (
            <View style={[styles.unitRowBadge, { backgroundColor: Colors.accentLight }]}>
              <Text style={styles.unitRowBadgeText}>{t('learn.takeTest')}</Text>
            </View>
          )}
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// Main Screen
// =============================================================================

export default function LearningPathScreen() {
  const { t } = useTranslation();
  const { activeChild } = useAuth();
  const params = useLocalSearchParams<{ pathId: string }>();
  const pathId = params.pathId || 'biodiversity';

  const [pathDetail, setPathDetail] = useState<PathDetail | null>(null);
  const [units, setUnits] = useState<UnitDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  // ── Load Data ──
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const lang = getCurrentLanguage();
      const [pathRes, unitsRes] = await Promise.all([
        aiEngineClient.get(`/learning/paths/${pathId}`, {
          params: { language: lang, child_id: activeChild?.id },
        }),
        aiEngineClient.get(`/learning/paths/${pathId}/units`, {
          params: { language: lang, child_id: activeChild?.id },
        }),
      ]);
      setPathDetail(pathRes.data?.data);
      setUnits(unitsRes.data?.data || []);
    } catch (err) {
      setError(t('learn.errorLoadingPath'));
    } finally {
      setIsLoading(false);
    }
  }, [pathId, activeChild]);

  useEffect(() => {
    loadData();
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Handlers ──
  const handleUnitPress = useCallback((unit: UnitDetail) => {
    if (unit.is_locked) return;
    if (unit.is_completed && !unit.test_passed) {
      router.push({
        pathname: '/screens/unit-test',
        params: { pathId, unitNumber: unit.unit_number },
      } as any);
    } else {
      router.push({
        pathname: '/screens/unit',
        params: { pathId, unitNumber: unit.unit_number },
      } as any);
    }
  }, [pathId]);

  const handleTakeFinalExam = useCallback(() => {
    router.push({
      pathname: '/screens/final-exam',
      params: { pathId },
    } as any);
  }, [pathId]);

  const allUnitsCompleted = units.length > 0 && units.every((u) => u.is_completed && u.test_passed);
  const progress = pathDetail?.child_progress?.overall_progress || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: pathDetail?.name || t('learn.learningPath'),
          headerBackTitle: t('common.back'),
        }}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner message={t('learn.loading')} color={pathDetail?.color || Colors.primary} />
          </View>
        ) : error ? (
          <ErrorDisplay message={error} onRetry={loadData} />
        ) : !pathDetail ? (
          <EmptyState emoji="🌿" title={t('learn.pathNotFound')} description={t('learn.pathNotFoundDesc')} />
        ) : (
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
            {/* ── Path Header ── */}
            <LinearGradient
              colors={[pathDetail.color, pathDetail.color + 'DD']}
              style={styles.pathHeader}
            >
              <Text style={styles.pathHeaderEmoji}>{pathDetail.emoji}</Text>
              <Text style={styles.pathHeaderName}>{pathDetail.name}</Text>
              <Text style={styles.pathHeaderDescription}>{pathDetail.description}</Text>

              <View style={styles.progressContainer}>
                <ProgressCircle
                  progress={progress}
                  size={100}
                  strokeWidth={8}
                  color={Colors.white}
                  emoji={pathDetail.emoji}
                />
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{pathDetail.child_progress?.total_units_completed || 0}</Text>
                  <Text style={styles.statLabel}>{t('learn.unitsCompleted')}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{pathDetail.child_progress?.total_tests_passed || 0}</Text>
                  <Text style={styles.statLabel}>{t('learn.testsPassed')}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatPoints(pathDetail.child_progress?.total_points_earned || 0)}</Text>
                  <Text style={styles.statLabel}>{t('common.points')}</Text>
                </View>
              </View>

              {pathDetail.child_progress && pathDetail.child_progress.streak_days > 0 && (
                <View style={styles.streakBadge}>
                  <Text style={styles.streakIcon}>🔥</Text>
                  <Text style={styles.streakText}>
                    {pathDetail.child_progress.streak_days} {t('home.streak')}
                  </Text>
                </View>
              )}
            </LinearGradient>

            {/* ── Units Timeline ── */}
            <View style={styles.unitsContainer}>
              <Text style={styles.sectionTitle}>{t('learn.units')}</Text>
              {units.map((unit, index) => (
                <UnitRow
                  key={unit.id || index}
                  unit={unit}
                  color={pathDetail.color}
                  isLast={index === units.length - 1}
                  onPress={() => handleUnitPress(unit)}
                  t={t}
                />
              ))}
            </View>

            {/* ── Final Exam Button ── */}
            {allUnitsCompleted && (
              <View style={styles.finalExamContainer}>
                <TouchableOpacity
                  style={[styles.finalExamButton, Shadows.colored(Colors.accent)]}
                  onPress={handleTakeFinalExam}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[Colors.accent, Colors.gradients.quizStart]}
                    style={styles.finalExamGradient}
                  >
                    <Text style={styles.finalExamEmoji}>🏆</Text>
                    <Text style={styles.finalExamText}>{t('learn.finalExam')}</Text>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M5 12h14M12 5l7 7-7 7" />
                    </Svg>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Tips ── */}
            <View style={styles.tipsContainer}>
              <Text style={styles.sectionTitle}>{t('learn.tips')}</Text>
              <View style={styles.tipCard}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M12 20V10" />
                  <Path d="M18 20V4" />
                  <Path d="M6 20v-4" />
                </Svg>
                <Text style={styles.tipText}>{t('learn.tipProgress')}</Text>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* ── Bottom Tab Bar ── */}
      <BottomTabBar t={t} />
    </SafeAreaView>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray100,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Path Header ──
  pathHeader: {
    padding: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    alignItems: 'center',
    gap: Spacing.sm,
  },
  pathHeaderEmoji: {
    fontSize: 56,
  },
  pathHeaderName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.white,
    textAlign: 'center',
  },
  pathHeaderDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Progress Circle ──
  progressContainer: {
    marginVertical: Spacing.lg,
  },
  progressCircle: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircleContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressEmoji: {
    fontSize: 28,
  },
  progressPercent: {
    fontSize: 18,
    fontWeight: '800',
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    gap: 6,
    marginTop: Spacing.sm,
  },
  streakIcon: {
    fontSize: 16,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },

  // ── Units Timeline ──
  unitsContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.black,
    marginBottom: Spacing.md,
  },

  // ── Unit Row ──
  unitRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  unitRowLocked: {
    opacity: 0.5,
  },
  unitRowLeft: {
    alignItems: 'center',
    width: 30,
  },
  unitStatusContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    zIndex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  unitRowLine: {
    width: 3,
    flex: 1,
    minHeight: 40,
    marginTop: -2,
    marginBottom: -2,
  },
  unitRowCard: {
    flex: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.base,
  },
  unitRowGradient: {
    padding: Spacing.base,
    gap: Spacing.xs,
  },
  unitRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitRowNumber: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unitRowLessons: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  unitRowLessonsText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray600,
  },
  unitRowName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.black,
  },
  unitRowScore: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
  },
  unitRowBadge: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  unitRowBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.accent,
  },

  // ── Final Exam ──
  finalExamContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
  },
  finalExamButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  finalExamGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  finalExamEmoji: {
    fontSize: 28,
  },
  finalExamText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
    flex: 1,
  },

  // ── Tips ──
  tipsContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: Colors.gray600,
    lineHeight: 20,
  },
});