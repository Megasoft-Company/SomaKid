/**
 * SOMAKID AI - Unit Screen
 * Detailed view of a learning unit with all lessons listed.
 * Shows lesson completion status, locks/unlocks, and progress.
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
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { formatPoints } from '../../utils/formatting';
import { aiEngineClient } from '../../services/api/client';
import { getCurrentLanguage } from '../../i18n';
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import Svg, { Path, Circle } from 'react-native-svg';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

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
}

interface LessonItem {
  id: string;
  lesson_number: number;
  title: string;
  lesson_type: 'theory' | 'practice' | 'review' | 'exam';
  emoji: string;
  duration_minutes: number;
  is_completed: boolean;
  is_locked: boolean;
}

function LessonRow({
  lesson,
  color,
  isLast,
  onPress,
  t,
}: {
  lesson: LessonItem;
  color: string;
  isLast: boolean;
  onPress: () => void;
  t: (key: string) => string;
}) {
  const typeEmoji: Record<string, string> = {
    theory: '📖',
    practice: '✍️',
    review: '🔄',
    exam: '🏆',
  };

  const typeLabel: Record<string, string> = {
    theory: t('learn.theory'),
    practice: t('learn.practice'),
    review: t('learn.review'),
    exam: t('learn.exam'),
  };

  return (
    <TouchableOpacity
      style={[styles.lessonRow, lesson.is_locked && styles.lessonRowLocked]}
      onPress={onPress}
      disabled={lesson.is_locked}
      activeOpacity={0.8}
    >
      <View style={styles.lessonRowLeft}>
        <View style={[
          styles.lessonStatusDot,
          {
            backgroundColor: lesson.is_completed
              ? Colors.success
              : lesson.is_locked
              ? Colors.gray300
              : color,
          },
        ]}>
          {lesson.is_completed ? (
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20 6L9 17l-5-5" />
            </Svg>
          ) : lesson.is_locked ? (
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" />
              <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </Svg>
          ) : (
            <Text style={styles.lessonNumberText}>{lesson.lesson_number}</Text>
          )}
        </View>
        {!isLast && (
          <View style={[styles.lessonLine, { backgroundColor: lesson.is_completed ? Colors.success : Colors.gray200 }]} />
        )}
      </View>

      <View style={[styles.lessonCard, Shadows.sm]}>
        <LinearGradient
          colors={
            lesson.is_locked
              ? [Colors.gray200, Colors.gray300]
              : lesson.is_completed
              ? [Colors.successSurface, Colors.white]
              : [Colors.white, Colors.gray100]
          }
          style={styles.lessonCardGradient}
        >
          <View style={styles.lessonCardHeader}>
            <Text style={styles.lessonEmoji}>{lesson.emoji || typeEmoji[lesson.lesson_type] || '📚'}</Text>
            <View style={[styles.lessonTypeBadge, { backgroundColor: lesson.is_locked ? Colors.gray300 : color + '15' }]}>
              <Text style={[styles.lessonTypeText, { color: lesson.is_locked ? Colors.gray500 : color }]}>
                {typeLabel[lesson.lesson_type] || lesson.lesson_type}
              </Text>
            </View>
          </View>
          <Text style={[styles.lessonTitle, lesson.is_locked && { color: Colors.gray500 }]}>
            {lesson.title}
          </Text>
          <View style={styles.lessonMeta}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={lesson.is_locked ? Colors.gray400 : Colors.gray500} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx="12" cy="12" r="10" />
              <Path d="M12 6v6l4 2" />
            </Svg>
            <Text style={[styles.lessonMetaText, lesson.is_locked && { color: Colors.gray400 }]}>
              {lesson.duration_minutes} min
            </Text>
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

export default function UnitScreen() {
  const { t } = useTranslation();
  const { activeChild } = useAuth();
  const params = useLocalSearchParams<{ pathId: string; unitNumber: string }>();
  const pathId = params.pathId || 'biodiversity';
  const unitNumber = parseInt(params.unitNumber || '1');

  const [unitDetail, setUnitDetail] = useState<UnitDetail | null>(null);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const lang = getCurrentLanguage();
      const res = await aiEngineClient.get(`/learning/paths/${pathId}/units/${unitNumber}`, {
        params: { language: lang, child_id: activeChild?.id },
      });
      const data = res.data?.data;
      setUnitDetail(data);
      setLessons(data?.lessons || getDefaultLessons(unitNumber));
    } catch (err) {
      setError(t('learn.errorLoadingUnit'));
    } finally {
      setIsLoading(false);
    }
  }, [pathId, unitNumber, activeChild]);

  useEffect(() => {
    loadData();
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLessonPress = useCallback((lesson: LessonItem) => {
    if (lesson.is_locked) return;
    router.push({
      pathname: '/screens/lesson',
      params: {
        pathId,
        unitNumber: String(unitNumber),
        lessonNumber: String(lesson.lesson_number),
      },
    } as any);
  }, [pathId, unitNumber]);

  const handleTakeTest = useCallback(() => {
    router.push({
      pathname: '/screens/unit-test',
      params: { pathId, unitNumber: String(unitNumber) },
    } as any);
  }, [pathId, unitNumber]);

  const allLessonsCompleted = lessons.length > 0 && lessons.every((l) => l.is_completed);
  const pathColor = pathId === 'biodiversity' ? Colors.modules.explorer :
    pathId === 'climate' ? '#1B6CA8' :
    pathId === 'disasters' ? '#C0392B' : '#8B5CF6';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: unitDetail?.name || `${t('learn.unit')} ${unitNumber}`,
          headerBackTitle: t('common.back'),
        }}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner message={t('learn.loading')} color={pathColor} />
          </View>
        ) : error ? (
          <ErrorDisplay message={error} onRetry={loadData} />
        ) : !unitDetail ? (
          <ErrorDisplay message={t('learn.unitNotFound')} onRetry={loadData} />
        ) : (
          <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideUp }] }}>
            <LinearGradient colors={[pathColor, pathColor + 'DD']} style={styles.unitHeader}>
              <Text style={styles.unitHeaderEmoji}>
                {unitNumber === 1 ? '🌱' : unitNumber === 2 ? '🌿' : unitNumber === 3 ? '🌳' : unitNumber === 4 ? '🦁' : '🌍'}
              </Text>
              <Text style={styles.unitHeaderTitle}>{t('learn.unit')} {unitDetail.unit_number}</Text>
              <Text style={styles.unitHeaderName}>{unitDetail.name}</Text>
              <Text style={styles.unitHeaderDescription}>{unitDetail.description}</Text>

              <View style={styles.unitStatsRow}>
                <View style={styles.unitStat}>
                  <Text style={styles.unitStatValue}>{unitDetail.lessons_completed}/{unitDetail.total_lessons}</Text>
                  <Text style={styles.unitStatLabel}>{t('learn.lessons')}</Text>
                </View>
                <View style={styles.unitStatDivider} />
                <View style={styles.unitStat}>
                  <Text style={styles.unitStatValue}>{unitDetail.required_score}%</Text>
                  <Text style={styles.unitStatLabel}>{t('learn.passingScore')}</Text>
                </View>
                <View style={styles.unitStatDivider} />
                <View style={styles.unitStat}>
                  <Text style={styles.unitStatValue}>
                    {unitDetail.is_completed && unitDetail.test_passed ? '✅' : unitDetail.is_locked ? '🔒' : '📖'}
                  </Text>
                  <Text style={styles.unitStatLabel}>{t('learn.status')}</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.lessonsSection}>
              <Text style={styles.sectionTitle}>{t('learn.lessons')}</Text>
              {lessons.map((lesson, index) => (
                <LessonRow
                  key={lesson.id || index}
                  lesson={lesson}
                  color={pathColor}
                  isLast={index === lessons.length - 1}
                  onPress={() => handleLessonPress(lesson)}
                  t={t}
                />
              ))}
            </View>

            {allLessonsCompleted && !unitDetail.test_passed && (
              <View style={styles.testSection}>
                <TouchableOpacity onPress={handleTakeTest} activeOpacity={0.85}>
                  <LinearGradient colors={[Colors.accent, Colors.gradients.quizStart]} style={styles.testButton}>
                    <Text style={styles.testEmoji}>📝</Text>
                    <View style={styles.testTextContainer}>
                      <Text style={styles.testTitle}>{t('learn.unitTest')}</Text>
                      <Text style={styles.testSubtitle}>{t('learn.unitTestDesc')}</Text>
                    </View>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M5 12h14M12 5l7 7-7 7" />
                    </Svg>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {unitDetail.is_completed && unitDetail.test_passed && (
              <View style={styles.completedSection}>
                <LinearGradient colors={[Colors.success, Colors.primary]} style={styles.completedBadge}>
                  <Text style={styles.completedEmoji}>🎉</Text>
                  <Text style={styles.completedText}>{t('learn.unitCompleted')}</Text>
                </LinearGradient>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getDefaultLessons(unitNumber: number): LessonItem[] {
  return [
    { id: '1', lesson_number: 1, title: 'Découverte', lesson_type: 'theory', emoji: '📖', duration_minutes: 5, is_completed: false, is_locked: false },
    { id: '2', lesson_number: 2, title: 'Application', lesson_type: 'practice', emoji: '✍️', duration_minutes: 8, is_completed: false, is_locked: true },
    { id: '3', lesson_number: 3, title: 'Exploration', lesson_type: 'theory', emoji: '🔍', duration_minutes: 6, is_completed: false, is_locked: true },
    { id: '4', lesson_number: 4, title: 'Révision', lesson_type: 'review', emoji: '🔄', duration_minutes: 10, is_completed: false, is_locked: true },
  ];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scrollContent: { flexGrow: 1 },
  loadingContainer: { flex: 1, minHeight: 300, justifyContent: 'center', alignItems: 'center' },

  unitHeader: { padding: Spacing.xl, paddingBottom: Spacing['2xl'], alignItems: 'center', gap: Spacing.xs },
  unitHeaderEmoji: { fontSize: 48 },
  unitHeaderTitle: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  unitHeaderName: { fontSize: 24, fontWeight: '800', color: Colors.white, textAlign: 'center' },
  unitHeaderDescription: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20 },

  unitStatsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl, marginTop: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.xl, padding: Spacing.md },
  unitStat: { flex: 1, alignItems: 'center', gap: 4 },
  unitStatValue: { fontSize: 18, fontWeight: '800', color: Colors.white },
  unitStatLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.3 },
  unitStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

  lessonsSection: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.black, marginBottom: Spacing.md },

  lessonRow: { flexDirection: 'row', gap: Spacing.md },
  lessonRowLocked: { opacity: 0.5 },
  lessonRowLeft: { alignItems: 'center', width: 30 },
  lessonStatusDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  lessonNumberText: { fontSize: 12, fontWeight: '800', color: Colors.white },
  lessonLine: { width: 3, flex: 1, minHeight: 30, marginTop: -2, marginBottom: -2 },

  lessonCard: { flex: 1, borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.base },
  lessonCardGradient: { padding: Spacing.base, gap: Spacing.xs },
  lessonCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lessonEmoji: { fontSize: 24 },
  lessonTypeBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  lessonTypeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  lessonTitle: { fontSize: 16, fontWeight: '700', color: Colors.black },
  lessonMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lessonMetaText: { fontSize: 12, fontWeight: '600', color: Colors.gray500 },

  testSection: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl },
  testButton: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius.xl, gap: Spacing.md },
  testEmoji: { fontSize: 32 },
  testTextContainer: { flex: 1, gap: 4 },
  testTitle: { fontSize: 16, fontWeight: '800', color: Colors.white },
  testSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  completedSection: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
  completedBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, borderRadius: BorderRadius.xl, gap: Spacing.md },
  completedEmoji: { fontSize: 28 },
  completedText: { fontSize: 18, fontWeight: '800', color: Colors.white },
});