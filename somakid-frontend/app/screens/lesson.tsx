/**
 * SOMAKID AI - Lesson Screen
 * Displays AI-generated lesson content and interactive exercises.
 * Handles exercise submission, scoring, and progression to the next lesson.
 *
 * KEY ARCHITECTURE NOTE:
 * The screen uses a `screenKey` derived from pathId+unitNumber+lessonNumber.
 * When the user navigates lesson→lesson via router.replace(), Expo Router may
 * reuse the same mounted component instead of unmounting/remounting it.
 * Detecting a key change lets us wipe all state and reload the new lesson
 * reliably, regardless of whether a full remount occurs.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Platform, TextInput,
} from 'react-native';
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
import Svg, { Path, Circle } from 'react-native-svg';

// =============================================================================
// CONSTANTS
// =============================================================================

const TAB_BAR_HEIGHT   = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

// Total lessons per unit — must match the backend constant
const TOTAL_LESSONS_PER_UNIT = 4;

// =============================================================================
// BottomTabBar — exact replica of app/(tabs)/_layout.tsx
// 6 tabs: Home · Learn · Explorer · Quiz · Chat · Profil
// "Learn" is always focused since this screen is a sub-screen of Learn.
// =============================================================================

function HomeIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={focused ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Path d="M9 22V12h6v10" />
    </Svg>
  );
}
function LearnIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={focused ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
      <Path d="M12 2v4" /><Path d="M12 18v4" />
      <Path d="M4.93 4.93l2.83 2.83" /><Path d="M16.24 16.24l2.83 2.83" />
      <Path d="M2 12h4" /><Path d="M18 12h4" />
      <Path d="M4.93 19.07l2.83-2.83" /><Path d="M16.24 7.76l2.83-2.83" />
    </Svg>
  );
}
function ExploreIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={focused ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
      <Path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    </Svg>
  );
}
function QuizIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={focused ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
    </Svg>
  );
}
function ChatIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={focused ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </Svg>
  );
}
function ProfileIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={focused ? 2.5 : 2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
    </Svg>
  );
}

function TabIcon({
  Icon, label, focused, color,
}: {
  Icon: React.FC<{ color: string; focused: boolean }>;
  label: string; focused: boolean; color: string;
}) {
  return (
    <View style={[tabStyles.tabItem, focused && { backgroundColor: color + '15' }]}>
      <Icon color={focused ? color : Colors.gray400} focused={focused} />
      {focused && (
        <Text style={[tabStyles.tabLabel, { color }]} numberOfLines={1} ellipsizeMode="tail">
          {label}
        </Text>
      )}
    </View>
  );
}

function BottomTabBar() {
  const TABS = [
    { key: 'index',    label: 'Home',    color: Colors.primary,                      Icon: HomeIcon,    route: '/(tabs)/' },
    { key: 'learn',    label: 'Learn',   color: '#8B5CF6',                           Icon: LearnIcon,   route: '/(tabs)/learn' },
    { key: 'explorer', label: 'Explore', color: Colors.modules?.explorer ?? '#4CAF50', Icon: ExploreIcon, route: '/(tabs)/explorer' },
    { key: 'quiz',     label: 'Quiz',    color: Colors.modules?.quiz    ?? Colors.accent, Icon: QuizIcon,  route: '/(tabs)/quiz' },
    { key: 'chat',     label: 'SOMA',    color: Colors.modules?.chat    ?? Colors.primary, Icon: ChatIcon, route: '/(tabs)/chat' },
    { key: 'profil',   label: 'Profile', color: Colors.accent,                       Icon: ProfileIcon, route: '/(tabs)/profil' },
  ];

  return (
    <View style={tabStyles.tabBar}>
      {TABS.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          style={tabStyles.tabTouchable}
          onPress={() => router.push(tab.route as any)}
          activeOpacity={0.8}
        >
          {/* "learn" tab always focused — we're in a Learn sub-screen */}
          <TabIcon Icon={tab.Icon} label={tab.label} focused={tab.key === 'learn'} color={tab.color} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderTopWidth: 0,
    height:        Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    paddingTop: 8,
    paddingHorizontal: 12,
    marginBottom:   Platform.OS === 'android' ? 10 : 0,
    marginHorizontal: Platform.OS === 'android' ? 10 : 0,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 20,
  },
  tabTouchable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BorderRadius.lg,
    minWidth: 52,
    maxWidth: 72,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});

// =============================================================================
// Types
// =============================================================================

interface LessonData {
  id: string;
  path_id: string;
  unit_number: number;
  lesson_number: number;
  title: string;
  content: string;
  summary: string;
  key_points: string[];
  vocabulary: { word: string; definition: string }[];
  exercises: ExerciseData[];
  fun_fact: string;
  practical_tip: string;
  emoji: string;
  estimated_minutes: number;
  lesson_type: 'theory' | 'practice' | 'review' | 'exam';
  difficulty: number;
}

interface ExerciseData {
  id: string;
  exercise_type:
    | 'multiple_choice' | 'true_false' | 'fill_blank'
    | 'open_question'   | 'matching'   | 'image_identification';
  question: string;
  options: string[];
  correct_answer?: any;
  explanation: string;
  points: number;
  order_index: number;
}

interface ExerciseResult {
  is_correct: boolean;
  explanation: string;
  points_earned: number;
  correct_answer?: any;
  correct_answer_index?: number;
}

// =============================================================================
// ExerciseCard Component
// =============================================================================

function ExerciseCard({
  exercise, onAnswer, isAnswered, result, t,
}: {
  exercise: ExerciseData;
  onAnswer: (answer: any) => void;
  isAnswered: boolean;
  result: ExerciseResult | null;
  t: (key: string) => string;
}) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textAnswer, setTextAnswer]         = useState('');
  const animScale = useRef(new Animated.Value(1)).current;

  useEffect(() => { setSelectedOption(null); setTextAnswer(''); }, [exercise.id]);

  const handleOptionPress = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    Animated.sequence([
      Animated.timing(animScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(animScale, { toValue: 1,    duration: 100, useNativeDriver: true }),
    ]).start();
    onAnswer(index);
  };

  const handleTextSubmit = () => { if (textAnswer.trim()) onAnswer(textAnswer.trim()); };

  return (
    <Animated.View style={localStyles.exerciseCardAnimated}>
      {/* Header: type badge + points */}
      <View style={localStyles.exerciseHeader}>
        <View style={[localStyles.exerciseTypeBadge, { backgroundColor: Colors.primary + '15' }]}>
          <Text style={[localStyles.exerciseTypeText, { color: Colors.primary }]}>
            {exercise.exercise_type === 'multiple_choice' ? 'QCM'
              : exercise.exercise_type === 'true_false'   ? t('learn.trueFalse')
              : exercise.exercise_type === 'fill_blank'   ? t('learn.fillBlank')
              : t('learn.openQuestion')}
          </Text>
        </View>
        <Text style={localStyles.exercisePoints}>+{exercise.points} pts</Text>
      </View>

      {/* Question */}
      <Text style={localStyles.exerciseQuestion}>{exercise.question}</Text>

      {/* Multiple-choice / True-False */}
      {(exercise.exercise_type === 'multiple_choice' || exercise.exercise_type === 'true_false') && (
        <View style={localStyles.optionsContainer}>
          {(exercise.exercise_type === 'true_false'
            ? [t('learn.true'), t('learn.false')]
            : exercise.options
          ).map((option: string, index: number) => {
            const isSelected      = selectedOption === index;
            const isCorrectOption = result ? index === result.correct_answer_index : false;
            const isWrongSelected = result ? isSelected && !result.is_correct : false;

            let bgColor: string = Colors.gray100, borderColor: string = Colors.gray200;
            let textColor: string = Colors.gray700, textWeight: '500' | '700' = '500';

            if (result && isCorrectOption)      { bgColor = Colors.primary; borderColor = Colors.primary; textColor = Colors.white; textWeight = '700'; }
            else if (isWrongSelected)           { bgColor = Colors.danger + '15'; borderColor = Colors.danger; textColor = Colors.danger; textWeight = '700'; }
            else if (isSelected && !result)     { bgColor = Colors.primary + '15'; borderColor = Colors.primary; textColor = Colors.primary; textWeight = '700'; }

            return (
              <TouchableOpacity
                key={index}
                style={{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: Spacing.md, padding: Spacing.md, borderRadius: BorderRadius.lg, borderWidth: 2, borderColor, backgroundColor: bgColor }}
                onPress={() => handleOptionPress(index)}
                disabled={isAnswered}
                activeOpacity={0.8}
              >
                {exercise.exercise_type === 'multiple_choice' && (
                  <View style={localStyles.optionLetter}>
                    <Text style={localStyles.optionLetterText}>{String.fromCharCode(65 + index)}</Text>
                  </View>
                )}
                <Text style={[localStyles.optionText, { color: textColor, fontWeight: textWeight }]}>{option}</Text>
                {result && isCorrectOption && (
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M20 6L9 17l-5-5" />
                  </Svg>
                )}
                {isWrongSelected && (
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.danger} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M18 6L6 18M6 6l12 12" />
                  </Svg>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Fill blank / Open question */}
      {(exercise.exercise_type === 'fill_blank' || exercise.exercise_type === 'open_question') && (
        <View style={localStyles.fillBlankContainer}>
          <TextInput
            style={isAnswered ? localStyles.inputDisabled : localStyles.fillBlankInput}
            placeholder={exercise.exercise_type === 'fill_blank' ? t('learn.typeAnswer') : t('learn.writeAnswer')}
            placeholderTextColor={Colors.gray400}
            value={textAnswer}
            onChangeText={setTextAnswer}
            editable={!isAnswered}
            multiline={exercise.exercise_type === 'open_question'}
            numberOfLines={exercise.exercise_type === 'open_question' ? 4 : 1}
            textAlignVertical={exercise.exercise_type === 'open_question' ? 'top' : 'center'}
            onSubmitEditing={handleTextSubmit}
            returnKeyType="done"
          />
          {!isAnswered && (
            <TouchableOpacity
              style={!textAnswer.trim() ? localStyles.submitButtonDisabled : localStyles.submitButton}
              onPress={handleTextSubmit}
              disabled={!textAnswer.trim()}
              activeOpacity={0.8}
            >
              <Text style={localStyles.submitButtonText}>{t('learn.submit')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Feedback card */}
      {result && (
        <View style={[localStyles.feedbackCard, { backgroundColor: result.is_correct ? Colors.primary + '10' : Colors.accent + '10' }]}>
          <View style={localStyles.feedbackHeader}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
              stroke={result.is_correct ? Colors.primary : Colors.accent}
              strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              {result.is_correct
                ? <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />
                : <Path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" />}
            </Svg>
            <Text style={[localStyles.feedbackTitle, { color: result.is_correct ? Colors.primary : Colors.accent }]}>
              {result.is_correct ? t('learn.correct') : t('learn.incorrect')}
            </Text>
          </View>
          {!result.is_correct && result.correct_answer && (
            <View style={localStyles.correctAnswerRow}>
              <Text style={localStyles.correctAnswerLabel}>{t('learn.correctAnswer')}: </Text>
              <Text style={localStyles.correctAnswerText}>{result.correct_answer}</Text>
            </View>
          )}
          <Text style={localStyles.feedbackExplanation}>{result.explanation}</Text>
          {result.is_correct && (
            <Text style={localStyles.feedbackPoints}>+{result.points_earned} {t('common.points')}</Text>
          )}
        </View>
      )}
    </Animated.View>
  );
}

// =============================================================================
// LessonScreen (main export)
// =============================================================================

export default function LessonScreen() {
  const { t } = useTranslation();
  const { activeChild } = useAuth();

  const params       = useLocalSearchParams<{ pathId: string; unitNumber: string; lessonNumber: string }>();
  const pathId       = params.pathId       || 'biodiversity';
  const unitNumber   = parseInt(params.unitNumber   || '1');
  const lessonNumber = parseInt(params.lessonNumber || '1');

  const buildKey = (p: string, u: number, l: number) => `${p}-${u}-${l}`;
  const [screenKey, setScreenKey] = useState(() => buildKey(pathId, unitNumber, lessonNumber));

  const [lesson, setLesson]                             = useState<LessonData | null>(null);
  const [isLoading, setIsLoading]                       = useState(true);
  const [error, setError]                               = useState<string | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [exerciseResults, setExerciseResults]           = useState<Map<string, ExerciseResult>>(new Map());
  const [showContent, setShowContent]                   = useState(true);
  const [lessonCompleted, setLessonCompleted]           = useState(false);
  const [allLessonsInUnitDone, setAllLessonsInUnitDone] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;

  const resetAllState = () => {
    setLesson(null); setExerciseResults(new Map()); setCurrentExerciseIndex(0);
    setShowContent(true); setLessonCompleted(false); setAllLessonsInUnitDone(false);
    setError(null); fadeIn.setValue(0);
  };

  const fetchLesson = async (p: string, u: number, l: number) => {
    setIsLoading(true);
    try {
      const lang = getCurrentLanguage();
      const res = await aiEngineClient.post('/learning/lessons/generate', {
        path_id: p, unit_number: u, lesson_number: l, langue: lang,
        child_age: activeChild?.age || 8, child_level: activeChild?.level || 1,
      });
      setLesson(res.data?.data ?? null);
      Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch { setError(t('learn.errorLoadingLesson')); }
    finally  { setIsLoading(false); }
  };

  const incomingKey = buildKey(pathId, unitNumber, lessonNumber);
  useEffect(() => {
    if (incomingKey !== screenKey) { resetAllState(); setScreenKey(incomingKey); }
  }, [incomingKey]);

  useEffect(() => {
    const [p, u, l] = screenKey.split('-');
    resetAllState();
    fetchLesson(p, parseInt(u), parseInt(l));
  }, [screenKey]);

  const handleExerciseAnswer = useCallback(async (answer: any) => {
    if (!lesson) return;
    const exercise = lesson.exercises[currentExerciseIndex];
    if (!exercise) return;
    try {
      const res = await aiEngineClient.post('/learning/exercises/submit', {
        exercise_id: exercise.id, lesson_id: lesson.id, answer: String(answer),
        exercise_type: exercise.exercise_type, correct_answer: exercise.correct_answer,
        options: exercise.options, explanation: exercise.explanation, points: exercise.points,
        child_id: activeChild?.id, session_id: `lesson_${lesson.id}`,
      });
      const result: ExerciseResult = res.data?.data;
      setExerciseResults((prev) => { const m = new Map(prev); m.set(exercise.id, result); return m; });
    } catch {
      setExerciseResults((prev) => { const m = new Map(prev); m.set(exercise.id, { is_correct: false, explanation: t('learn.errorSubmitting'), points_earned: 0 }); return m; });
    }
  }, [lesson, currentExerciseIndex, activeChild, t]);

  const handleCompleteLesson = useCallback(async () => {
    if (!lesson || lessonCompleted) return;
    setLessonCompleted(true);
    const correctCount = Array.from(exerciseResults.values()).filter((r) => r.is_correct).length;
    const score = lesson.exercises.length > 0 ? Math.round((correctCount / lesson.exercises.length) * 100) : 100;
    try {
      const res = await aiEngineClient.post('/learning/lessons/complete', {
        lesson_id: `lesson_${pathId}_${unitNumber}_${lessonNumber}`,
        unit_id: String(unitNumber), path_id: pathId,
        child_id: activeChild?.id || 'anonymous', score, time_spent_seconds: 0,
      });
      setAllLessonsInUnitDone(res.data?.data?.all_lessons_completed === true);
    } catch { setAllLessonsInUnitDone(false); }
  }, [lesson, exerciseResults, lessonCompleted, pathId, unitNumber, lessonNumber, activeChild]);

  const handleNextExercise = useCallback(() => {
    if (!lesson) return;
    currentExerciseIndex < lesson.exercises.length - 1
      ? setCurrentExerciseIndex((p) => p + 1)
      : handleCompleteLesson();
  }, [lesson, currentExerciseIndex]);

  const handleGoToNextLesson = useCallback(() => {
    router.replace({ pathname: '/screens/lesson', params: { pathId, unitNumber: String(unitNumber), lessonNumber: String(lessonNumber + 1) } } as any);
  }, [pathId, unitNumber, lessonNumber]);

  const handleStartExercises = useCallback(() => { setShowContent(false); setCurrentExerciseIndex(0); }, []);
  const handleBackToContent  = useCallback(() => setShowContent(true), []);

  const currentExercise   = lesson?.exercises[currentExerciseIndex];
  const currentResult     = currentExercise ? exerciseResults.get(currentExercise.id) : null;
  const isCurrentAnswered = currentResult !== undefined;
  const totalCorrect      = Array.from(exerciseResults.values()).filter((r) => r.is_correct).length;
  const isLastLesson      = lessonNumber >= TOTAL_LESSONS_PER_UNIT;

  // =============================================================================
  // Render
  // =============================================================================
  return (
    <SafeAreaView style={localStyles.container} edges={['top']}>
      <Stack.Screen
        options={{
          title: lesson?.title || t('learn.lesson'),
          headerBackTitle: t('common.back'),
          headerBackVisible: true,
          headerStyle: { backgroundColor: Colors.white },
          headerTitleStyle: { fontWeight: '600', color: Colors.black },
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        contentContainerStyle={[localStyles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={localStyles.loadingContainer}>
            <LoadingSpinner message={t('learn.loading')} color={Colors.primary} />
          </View>
        ) : error ? (
          <ErrorDisplay message={error} onRetry={() => fetchLesson(pathId, unitNumber, lessonNumber)} />
        ) : !lesson ? (
          <ErrorDisplay message={t('learn.lessonNotFound')} onRetry={() => fetchLesson(pathId, unitNumber, lessonNumber)} />
        ) : showContent ? (
          // ──────────────────────────────────────────────────────────────────
          // CONTENT VIEW
          // ──────────────────────────────────────────────────────────────────
          <Animated.View style={{ opacity: fadeIn }}>
            <LinearGradient colors={[Colors.gradients.heroStart, Colors.gradients.heroMiddle]} style={localStyles.lessonHeader}>
              <Text style={localStyles.lessonEmoji}>{lesson.emoji}</Text>
              <Text style={localStyles.lessonTitle}>{lesson.title}</Text>
              <View style={localStyles.lessonMeta}>
                <View style={localStyles.lessonMetaItem}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Circle cx="12" cy="12" r="10" /><Path d="M12 6v6l4 2" />
                  </Svg>
                  <Text style={localStyles.lessonMetaText}>{lesson.estimated_minutes} min</Text>
                </View>
                <View style={localStyles.lessonMetaItem}>
                  <Text style={localStyles.lessonMetaText}>{'⭐'.repeat(lesson.difficulty)}</Text>
                </View>
                <View style={localStyles.lessonMetaItem}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </Svg>
                  <Text style={localStyles.lessonMetaText}>{lesson.exercises.length} {t('learn.exercises')}</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={localStyles.contentSection}>
              <Text style={localStyles.contentText}>{lesson.content}</Text>
            </View>

            {lesson.vocabulary?.length > 0 && (
              <View style={localStyles.section}>
                <Text style={localStyles.sectionTitle}>{t('learn.vocabulary')}</Text>
                {lesson.vocabulary.map((vocab, i) => (
                  <View key={i} style={localStyles.vocabCard}>
                    <Text style={localStyles.vocabWord}>{vocab.word}</Text>
                    <Text style={localStyles.vocabDefinition}>{vocab.definition}</Text>
                  </View>
                ))}
              </View>
            )}

            {lesson.key_points?.length > 0 && (
              <View style={localStyles.section}>
                <Text style={localStyles.sectionTitle}>{t('learn.keyPoints')}</Text>
                {lesson.key_points.map((point, i) => (
                  <View key={i} style={localStyles.keyPointCard}>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M20 6L9 17l-5-5" />
                    </Svg>
                    <Text style={localStyles.keyPointText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}

            {!!lesson.fun_fact && (
              <View style={localStyles.funFactCard}>
                <Text style={localStyles.funFactEmoji}>💡</Text>
                <View style={localStyles.funFactContent}>
                  <Text style={localStyles.funFactTitle}>{t('learn.didYouKnow')}</Text>
                  <Text style={localStyles.funFactText}>{lesson.fun_fact}</Text>
                </View>
              </View>
            )}

            {!!lesson.practical_tip && (
              <View style={localStyles.tipCard}>
                <Text style={localStyles.tipEmoji}>🌱</Text>
                <View style={localStyles.tipContent}>
                  <Text style={localStyles.tipTitle}>{t('learn.practicalTip')}</Text>
                  <Text style={localStyles.tipText}>{lesson.practical_tip}</Text>
                </View>
              </View>
            )}

            <View style={localStyles.startExercisesContainer}>
              <TouchableOpacity onPress={handleStartExercises} activeOpacity={0.85}>
                <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={localStyles.startExercisesGradient}>
                  <Text style={localStyles.startExercisesText}>
                    {t('learn.beginExercises')} ({lesson.exercises.length} {t('learn.exercises')})
                  </Text>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M5 12h14M12 5l7 7-7 7" />
                  </Svg>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : (
          // ──────────────────────────────────────────────────────────────────
          // EXERCISE VIEW
          // ──────────────────────────────────────────────────────────────────
          <Animated.View style={{ opacity: fadeIn }}>
            <View style={localStyles.exerciseProgressHeader}>
              <TouchableOpacity onPress={handleBackToContent} style={localStyles.backToContentButton}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M19 12H5M12 19l-7-7 7-7" />
                </Svg>
                <Text style={localStyles.backToContentText}>{t('learn.backToLesson')}</Text>
              </TouchableOpacity>
              <View style={localStyles.exerciseProgressBar}>
                <View style={[localStyles.exerciseProgressFill, { width: `${((currentExerciseIndex + (isCurrentAnswered ? 1 : 0)) / lesson.exercises.length) * 100}%` }]} />
              </View>
              <Text style={localStyles.exerciseProgressText}>{currentExerciseIndex + 1}/{lesson.exercises.length}</Text>
            </View>

            {currentExercise && (
              <ExerciseCard
                key={`${screenKey}-ex-${currentExercise.id}`}
                exercise={currentExercise}
                onAnswer={handleExerciseAnswer}
                isAnswered={isCurrentAnswered}
                result={currentResult || null}
                t={t}
              />
            )}

            {isCurrentAnswered && !lessonCompleted && (
              <View style={localStyles.exerciseNav}>
                {currentExerciseIndex < lesson.exercises.length - 1 ? (
                  <TouchableOpacity onPress={handleNextExercise} activeOpacity={0.85}>
                    <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={localStyles.nextExerciseGradient}>
                      <Text style={localStyles.nextExerciseText}>{t('learn.nextExercise')}</Text>
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M5 12h14M12 5l7 7-7 7" />
                      </Svg>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handleCompleteLesson} activeOpacity={0.85}>
                    <LinearGradient colors={[Colors.success, Colors.primary]} style={localStyles.finishGradient}>
                      <Text style={localStyles.finishText}>{t('learn.finishLesson')}</Text>
                      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />
                      </Svg>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {lessonCompleted && (
              <View style={localStyles.completedContainer}>
                <LinearGradient colors={[Colors.success, Colors.primary]} style={localStyles.completedCard}>
                  <Text style={localStyles.completedEmoji}>🎉</Text>
                  <Text style={localStyles.completedTitle}>{t('learn.lessonCompleted')}</Text>
                  <Text style={localStyles.completedSubtitle}>{totalCorrect}/{lesson.exercises.length} {t('learn.correctAnswers')}</Text>
                  {!isLastLesson && !allLessonsInUnitDone && (
                    <TouchableOpacity style={localStyles.completedButton} onPress={handleGoToNextLesson} activeOpacity={0.85}>
                      <Text style={localStyles.completedButtonText}>{t('learn.nextLesson')}</Text>
                    </TouchableOpacity>
                  )}
                  {(isLastLesson || allLessonsInUnitDone) && (
                    <TouchableOpacity style={localStyles.completedButton} onPress={() => router.back()} activeOpacity={0.85}>
                      <Text style={localStyles.completedButtonText}>{t('learn.backToUnits')}</Text>
                    </TouchableOpacity>
                  )}
                </LinearGradient>
              </View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* ── Tab bar — exact replica of _layout.tsx ── */}
      <BottomTabBar />
    </SafeAreaView>
  );
}

// =============================================================================
// Styles
// =============================================================================

const localStyles = StyleSheet.create({
  container:               { flex: 1, backgroundColor: Colors.gray100 },
  scrollContent:           { flexGrow: 1 },
  loadingContainer:        { flex: 1, minHeight: 300, justifyContent: 'center', alignItems: 'center' },

  lessonHeader:            { padding: Spacing.xl, paddingBottom: Spacing['2xl'], alignItems: 'center', gap: Spacing.sm },
  lessonEmoji:             { fontSize: 48 },
  lessonTitle:             { fontSize: 22, fontWeight: '800', color: Colors.white, textAlign: 'center' },
  lessonMeta:              { flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.xs },
  lessonMetaItem:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lessonMetaText:          { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },

  contentSection:          { padding: Spacing.base, marginHorizontal: Spacing.base, marginTop: Spacing.lg, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, ...Shadows.sm },
  contentText:             { fontSize: 16, color: Colors.gray700, lineHeight: 26 },
  section:                 { paddingHorizontal: Spacing.base, paddingTop: Spacing.lg },
  sectionTitle:            { fontSize: 18, fontWeight: '800', color: Colors.black, marginBottom: Spacing.md },
  vocabCard:               { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  vocabWord:               { fontSize: 16, fontWeight: '700', color: Colors.primary },
  vocabDefinition:         { fontSize: 14, color: Colors.gray500, flex: 1, textAlign: 'right', marginLeft: Spacing.md },
  keyPointCard:            { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  keyPointText:            { flex: 1, fontSize: 15, color: Colors.gray600, lineHeight: 22 },
  funFactCard:             { flexDirection: 'row', gap: Spacing.md, marginHorizontal: Spacing.base, marginTop: Spacing.lg, padding: Spacing.base, backgroundColor: Colors.accentLight + '30', borderRadius: BorderRadius.xl, borderLeftWidth: 4, borderLeftColor: Colors.accent },
  funFactEmoji:            { fontSize: 24 },
  funFactContent:          { flex: 1 },
  funFactTitle:            { fontSize: 13, fontWeight: '800', color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  funFactText:             { fontSize: 14, color: Colors.gray600, lineHeight: 20 },
  tipCard:                 { flexDirection: 'row', gap: Spacing.md, marginHorizontal: Spacing.base, marginTop: Spacing.md, padding: Spacing.base, backgroundColor: Colors.successSurface, borderRadius: BorderRadius.xl, borderLeftWidth: 4, borderLeftColor: Colors.success },
  tipEmoji:                { fontSize: 24 },
  tipContent:              { flex: 1 },
  tipTitle:                { fontSize: 13, fontWeight: '800', color: Colors.success, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  tipText:                 { fontSize: 14, color: Colors.gray600, lineHeight: 20 },
  startExercisesContainer: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
  startExercisesGradient:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md, borderRadius: BorderRadius.xl },
  startExercisesText:      { fontSize: 16, fontWeight: '700', color: Colors.white },

  exerciseProgressHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.md, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray200 },
  backToContentButton:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backToContentText:       { fontSize: 13, fontWeight: '600', color: Colors.primary },
  exerciseProgressBar:     { flex: 1, height: 6, backgroundColor: Colors.gray200, borderRadius: 3, overflow: 'hidden' },
  exerciseProgressFill:    { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  exerciseProgressText:    { fontSize: 13, fontWeight: '700', color: Colors.gray600 },

  exerciseHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exerciseTypeBadge:       { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  exerciseTypeText:        { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  exercisePoints:          { fontSize: 14, fontWeight: '700', color: Colors.accent },
  exerciseQuestion:        { fontSize: 18, fontWeight: '700', color: Colors.black, lineHeight: 28 },
  exerciseCardAnimated:    { margin: Spacing.base, padding: Spacing.lg, backgroundColor: Colors.white, borderRadius: BorderRadius['2xl'], ...Shadows.md, gap: Spacing.md },
  optionsContainer:        { gap: Spacing.sm },
  optionLetter:            { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  optionLetterText:        { fontSize: 14, fontWeight: '800', color: Colors.gray600 },
  optionText:              { flex: 1, fontSize: 16, fontWeight: '500', color: Colors.gray700 },

  fillBlankContainer:      { gap: Spacing.md },
  fillBlankInput:          { borderWidth: 2, borderColor: Colors.gray200, borderRadius: BorderRadius.lg, padding: Spacing.md, fontSize: 16, color: Colors.black, backgroundColor: Colors.gray100 },
  inputDisabled:           { borderWidth: 2, borderColor: Colors.gray200, borderRadius: BorderRadius.lg, padding: Spacing.md, fontSize: 16, color: Colors.gray400, backgroundColor: Colors.gray100, opacity: 0.5 },
  submitButton:            { borderRadius: BorderRadius.lg, backgroundColor: Colors.primary, padding: Spacing.md, alignItems: 'center' },
  submitButtonDisabled:    { borderRadius: BorderRadius.lg, backgroundColor: Colors.gray300, padding: Spacing.md, alignItems: 'center' },
  submitButtonText:        { fontSize: 16, fontWeight: '700', color: Colors.white },

  feedbackCard:            { borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm },
  feedbackHeader:          { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  feedbackTitle:           { fontSize: 16, fontWeight: '800' },
  correctAnswerRow:        { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.sm },
  correctAnswerLabel:      { fontSize: 14, fontWeight: '700', color: Colors.primary },
  correctAnswerText:       { fontSize: 14, fontWeight: '600', color: Colors.gray700, flex: 1 },
  feedbackExplanation:     { fontSize: 15, color: Colors.gray600, lineHeight: 22 },
  feedbackPoints:          { fontSize: 14, fontWeight: '700', color: Colors.primary, textAlign: 'right' },

  exerciseNav:             { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md },
  nextExerciseGradient:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.sm, borderRadius: BorderRadius.xl },
  nextExerciseText:        { fontSize: 16, fontWeight: '700', color: Colors.white },
  finishGradient:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.sm, borderRadius: BorderRadius.xl },
  finishText:              { fontSize: 16, fontWeight: '700', color: Colors.white },

  completedContainer:      { padding: Spacing.xl },
  completedCard:           { borderRadius: BorderRadius['2xl'], padding: Spacing['2xl'], alignItems: 'center', gap: Spacing.md },
  completedEmoji:          { fontSize: 64 },
  completedTitle:          { fontSize: 24, fontWeight: '800', color: Colors.white, textAlign: 'center' },
  completedSubtitle:       { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  completedButton:         { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.xl, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md, marginTop: Spacing.md },
  completedButtonText:     { fontSize: 16, fontWeight: '700', color: Colors.white },
});