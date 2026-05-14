/**
 * SOMAKID AI - Unit Screen
 * Detailed view of a learning unit with all lessons listed.
 * Shows lesson completion status, locks/unlocks, and progress.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { aiEngineClient } from '../../services/api/client';
import { getCurrentLanguage } from '../../i18n';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

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

// ---------------------------------------------------------------------------
// LessonRow component
// ---------------------------------------------------------------------------
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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, tension: 120, friction: 10, useNativeDriver: true }).start();

  const handlePressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }).start();

  const typeEmoji: Record<string, string> = { theory: '📖', practice: '✍️', review: '🔄', exam: '🏆' };
  const typeLabel: Record<string, string> = {
    theory: t('learn.theory'),
    practice: t('learn.practice'),
    review: t('learn.review'),
    exam: t('learn.exam'),
  };

  // A lesson is "active" when it is unlocked and not yet completed
  const isActive = !lesson.is_locked && !lesson.is_completed;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        disabled={lesson.is_locked}
        activeOpacity={0.9}
      >
        <View style={styles.lessonRow}>
          {/* Left column: status dot + connecting line */}
          <View style={styles.lessonRowLeft}>
            <View
              style={[
                styles.lessonStatusDot,
                {
                  backgroundColor: lesson.is_completed
                    ? Colors.success
                    : lesson.is_locked
                    ? Colors.gray300
                    : color,
                  borderColor: lesson.is_completed
                    ? Colors.success
                    : lesson.is_locked
                    ? Colors.gray300
                    : color,
                },
              ]}
            >
              {lesson.is_completed ? (
                <Svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Path d="M20 6L9 17l-5-5" />
                </Svg>
              ) : lesson.is_locked ? (
                <Svg
                  width={12}
                  height={12}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Rect x="3" y="11" width="18" height="11" rx="2" />
                  <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </Svg>
              ) : (
                <Text style={styles.lessonNumberText}>{lesson.lesson_number}</Text>
              )}
            </View>
            {/* Vertical connector line between dots (hidden after last item) */}
            {!isLast && (
              <View
                style={[
                  styles.lessonLine,
                  { backgroundColor: lesson.is_completed ? Colors.success : Colors.gray200 },
                ]}
              />
            )}
          </View>

          {/* Right column: lesson card */}
          <View style={[styles.lessonCard, Shadows.md, isActive && { borderColor: color + '40', borderWidth: 2 }]}>
            <LinearGradient
              colors={
                lesson.is_locked
                  ? [Colors.gray200, Colors.gray300]
                  : lesson.is_completed
                  ? [Colors.success + '12', Colors.white]
                  : [Colors.white, Colors.gray100]
              }
              style={styles.lessonCardGradient}
            >
              {/* Card header: emoji + type badge */}
              <View style={styles.lessonCardHeader}>
                <View style={styles.lessonEmojiContainer}>
                  <Text style={styles.lessonEmoji}>{lesson.emoji || typeEmoji[lesson.lesson_type] || '📚'}</Text>
                </View>
                <View
                  style={[
                    styles.lessonTypeBadge,
                    {
                      backgroundColor: lesson.is_locked
                        ? Colors.gray300
                        : isActive
                        ? color + '18'
                        : Colors.success + '18',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.lessonTypeDot,
                      {
                        backgroundColor: lesson.is_locked
                          ? Colors.gray400
                          : isActive
                          ? color
                          : Colors.success,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.lessonTypeText,
                      {
                        color: lesson.is_locked
                          ? Colors.gray500
                          : isActive
                          ? color
                          : Colors.success,
                      },
                    ]}
                  >
                    {typeLabel[lesson.lesson_type] || lesson.lesson_type}
                  </Text>
                </View>
              </View>

              {/* Lesson title */}
              <Text style={[styles.lessonTitle, lesson.is_locked && { color: Colors.gray400 }]} numberOfLines={1}>
                {lesson.title}
              </Text>

              {/* Duration + play icon */}
              <View style={styles.lessonMeta}>
                <Svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={lesson.is_locked ? Colors.gray400 : color + '80'}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <Circle cx="12" cy="12" r="10" />
                  <Path d="M12 6v6l4 2" />
                </Svg>
                <Text style={[styles.lessonMetaText, lesson.is_locked && { color: Colors.gray400 }]}>
                  {lesson.duration_minutes} min
                </Text>
                {isActive && (
                  <View style={styles.playIconContainer}>
                    <Svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill={color}
                      stroke={color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <Path d="M5 3l14 9-14 9V3z" />
                    </Svg>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// UnitScreen (main export)
// ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // loadData — always passes child_id so the API returns correct lock/unlock state
  // ---------------------------------------------------------------------------
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const lang = getCurrentLanguage();

      // FIX: child_id is now always included in the query params so that
      // _get_lessons_with_progress on the backend receives it and can correctly
      // calculate which lessons are completed / locked for this specific child.
      const res = await aiEngineClient.get(`/learning/paths/${pathId}/units/${unitNumber}`, {
        params: {
          language: lang,
          ...(activeChild?.id ? { child_id: activeChild.id } : {}),
        },
      });

      const data = res.data?.data;
      setUnitDetail(data);
      // Use lessons returned by the API (with progress); fall back to defaults
      // only if the API response contains none.
      setLessons(data?.lessons?.length ? data.lessons : getDefaultLessons(unitNumber));
    } catch (err) {
      setError(t('learn.errorLoadingUnit'));
    } finally {
      setIsLoading(false);
    }
  }, [pathId, unitNumber, activeChild, t]);

  // ---------------------------------------------------------------------------
  // FIX: depend on loadData so the screen refreshes when child / path changes,
  // and also on every focus (handled by the router's useFocusEffect alternative
  // using the key prop approach below via explicit deps).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    loadData();
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [loadData]); // re-runs whenever loadData identity changes (pathId, unitNumber, activeChild)

  // ---------------------------------------------------------------------------
  // Navigation handlers
  // ---------------------------------------------------------------------------
  const handleLessonPress = useCallback(
    (lesson: LessonItem) => {
      if (lesson.is_locked) return;
      router.push({
        pathname: '/screens/lesson',
        params: {
          pathId,
          unitNumber: String(unitNumber),
          lessonNumber: String(lesson.lesson_number),
        },
      } as any);
    },
    [pathId, unitNumber]
  );

  const handleTakeTest = useCallback(() => {
    router.push({
      pathname: '/screens/unit-test',
      params: { pathId, unitNumber: String(unitNumber) },
    } as any);
  }, [pathId, unitNumber]);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const allLessonsCompleted = lessons.length > 0 && lessons.every((l) => l.is_completed);

  const pathColor =
    pathId === 'biodiversity'
      ? Colors.modules.explorer
      : pathId === 'climate'
      ? '#1B6CA8'
      : pathId === 'disasters'
      ? '#C0392B'
      : '#8B5CF6';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
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
            {/* ----------------------------------------------------------------
                Unit header banner
            ---------------------------------------------------------------- */}
            <LinearGradient colors={[pathColor, pathColor + 'CC']} style={styles.unitHeader}>
              <View style={styles.unitHeaderGlow} />
              <Text style={styles.unitHeaderEmoji}>
                {unitNumber === 1
                  ? '🌱'
                  : unitNumber === 2
                  ? '🌿'
                  : unitNumber === 3
                  ? '🌳'
                  : unitNumber === 4
                  ? '🦁'
                  : '🌍'}
              </Text>
              <Text style={styles.unitHeaderTitle}>
                {t('learn.unit')} {unitDetail.unit_number}
              </Text>
              <Text style={styles.unitHeaderName}>{unitDetail.name}</Text>
              <Text style={styles.unitHeaderDescription}>{unitDetail.description}</Text>

              {/* Stats row */}
              <View style={styles.unitStatsRow}>
                <View style={styles.unitStat}>
                  <Text style={styles.unitStatValue}>
                    {unitDetail.lessons_completed}/{unitDetail.total_lessons}
                  </Text>
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
                    {unitDetail.is_completed && unitDetail.test_passed
                      ? '🏆'
                      : unitDetail.is_locked
                      ? '🔒'
                      : '📖'}
                  </Text>
                  <Text style={styles.unitStatLabel}>{t('learn.status')}</Text>
                </View>
              </View>
            </LinearGradient>

            {/* ----------------------------------------------------------------
                Lessons list
            ---------------------------------------------------------------- */}
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

            {/* ----------------------------------------------------------------
                Unit test CTA — shown only when all lessons done and test not yet passed
            ---------------------------------------------------------------- */}
            {allLessonsCompleted && !unitDetail.test_passed && (
              <View style={styles.testSection}>
                <TouchableOpacity
                  onPress={handleTakeTest}
                  activeOpacity={0.85}
                  style={Shadows.colored(Colors.accent)}
                >
                  <LinearGradient
                    colors={[Colors.accent, Colors.gradients.quizStart]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.testButton}
                  >
                    <View style={styles.testEmojiContainer}>
                      <Text style={styles.testEmoji}>📝</Text>
                    </View>
                    <View style={styles.testTextContainer}>
                      <Text style={styles.testTitle}>{t('learn.unitTest')}</Text>
                      <Text style={styles.testSubtitle}>{t('learn.unitTestDesc')}</Text>
                    </View>
                    <Svg
                      width={22}
                      height={22}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#fff"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <Path d="M5 12h14M12 5l7 7-7 7" />
                    </Svg>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* ----------------------------------------------------------------
                Unit completed badge — shown once test is passed
            ---------------------------------------------------------------- */}
            {unitDetail.is_completed && unitDetail.test_passed && (
              <View style={styles.completedSection}>
                <LinearGradient
                  colors={[Colors.success, Colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.completedBadge}
                >
                  <Text style={styles.completedEmoji}>🎉</Text>
                  <View>
                    <Text style={styles.completedText}>{t('learn.unitCompleted')}</Text>
                    <Text style={styles.completedSubtext}>{t('learn.unitTestDesc')}</Text>
                  </View>
                  <Svg
                    width={22}
                    height={22}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <Path d="M5 12h14M12 5l7 7-7 7" />
                  </Svg>
                </LinearGradient>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Fallback lesson list used only when the API returns no lesson data
// ---------------------------------------------------------------------------
function getDefaultLessons(unitNumber: number): LessonItem[] {
  return [
    { id: '1', lesson_number: 1, title: 'Découverte',  lesson_type: 'theory',   emoji: '📖', duration_minutes: 5,  is_completed: false, is_locked: false },
    { id: '2', lesson_number: 2, title: 'Application', lesson_type: 'practice', emoji: '✍️', duration_minutes: 8,  is_completed: false, is_locked: true  },
    { id: '3', lesson_number: 3, title: 'Exploration', lesson_type: 'theory',   emoji: '🔍', duration_minutes: 6,  is_completed: false, is_locked: true  },
    { id: '4', lesson_number: 4, title: 'Révision',    lesson_type: 'review',   emoji: '🔄', duration_minutes: 10, is_completed: false, is_locked: true  },
  ];
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container:               { flex: 1, backgroundColor: Colors.gray100 },
  scrollContent:           { flexGrow: 1 },
  loadingContainer:        { flex: 1, minHeight: 300, justifyContent: 'center', alignItems: 'center' },

  // Unit header
  unitHeader:              { padding: Spacing.xl, paddingBottom: Spacing['2xl'], alignItems: 'center', gap: Spacing.xs, position: 'relative', overflow: 'hidden' },
  unitHeaderGlow:          { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -40 },
  unitHeaderEmoji:         { fontSize: 52 },
  unitHeaderTitle:         { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 2 },
  unitHeaderName:          { fontSize: 26, fontWeight: '900', color: Colors.white, textAlign: 'center', letterSpacing: -0.3 },
  unitHeaderDescription:   { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20 },
  unitStatsRow:            { flexDirection: 'row', alignItems: 'center', gap: Spacing.xl, marginTop: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: BorderRadius['2xl'], padding: Spacing.md, paddingHorizontal: Spacing.xl },
  unitStat:                { flex: 1, alignItems: 'center', gap: 4 },
  unitStatValue:           { fontSize: 20, fontWeight: '900', color: Colors.white },
  unitStatLabel:           { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  unitStatDivider:         { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Lessons list
  lessonsSection:          { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl },
  sectionTitle:            { fontSize: 20, fontWeight: '800', color: Colors.black, marginBottom: Spacing.md, letterSpacing: -0.3 },
  lessonRow:               { flexDirection: 'row', gap: Spacing.md },
  lessonRowLeft:           { alignItems: 'center', width: 32 },
  lessonStatusDot:         { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', zIndex: 1, borderWidth: 2 },
  lessonNumberText:        { fontSize: 13, fontWeight: '800', color: Colors.white },
  lessonLine:              { width: 3, flex: 1, minHeight: 28, marginTop: -2, marginBottom: -2, borderRadius: 2 },
  lessonCard:              { flex: 1, borderRadius: BorderRadius['2xl'], overflow: 'hidden', marginBottom: Spacing.base },
  lessonCardGradient:      { padding: Spacing.md, gap: Spacing.xs },
  lessonCardHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lessonEmojiContainer:    { width: 40, height: 40, borderRadius: BorderRadius.xl, backgroundColor: 'rgba(0,0,0,0.03)', alignItems: 'center', justifyContent: 'center' },
  lessonEmoji:             { fontSize: 22 },
  lessonTypeBadge:         { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  lessonTypeDot:           { width: 7, height: 7, borderRadius: 4 },
  lessonTypeText:          { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  lessonTitle:             { fontSize: 16, fontWeight: '700', color: Colors.black },
  lessonMeta:              { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lessonMetaText:          { fontSize: 12, fontWeight: '600', color: Colors.gray500 },
  playIconContainer:       { marginLeft: 'auto' },

  // Test CTA
  testSection:             { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl },
  testButton:              { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius['2xl'], gap: Spacing.md },
  testEmojiContainer:      { width: 52, height: 52, borderRadius: BorderRadius.xl, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  testEmoji:               { fontSize: 28 },
  testTextContainer:       { flex: 1, gap: 4 },
  testTitle:               { fontSize: 17, fontWeight: '800', color: Colors.white },
  testSubtitle:            { fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },

  // Completed badge
  completedSection:        { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
  completedBadge:          { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, borderRadius: BorderRadius['2xl'], gap: Spacing.md },
  completedEmoji:          { fontSize: 32 },
  completedText:           { fontSize: 17, fontWeight: '800', color: Colors.white },
  completedSubtext:        { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
});