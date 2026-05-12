/**
 * SOMAKID AI - Exercise Screen
 * Standalone exercise view for practicing specific topics.
 * Supports all 6 exercise types with immediate feedback.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, Stack } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../hooks/useAuth';
import { aiEngineClient } from '../../services/api/client';
import { getCurrentLanguage } from '../../i18n';
import {
  Colors,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import Svg, { Path } from 'react-native-svg';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

interface ExerciseData {
  id: string;
  exercise_type: string;
  question: string;
  options: string[];
  explanation: string;
  points: number;
}

interface ExerciseResult {
  is_correct: boolean;
  correct_answer: any;
  explanation: string;
  points_earned: number;
}

export default function ExerciseScreen() {
  const { t } = useTranslation();
  const { activeChild } = useAuth();
  const params = useLocalSearchParams<{ topic?: string; type?: string }>();
  const topic = params.topic || '';
  const exerciseType = params.type || 'multiple_choice';

  const [exercises, setExercises] = useState<ExerciseData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [result, setResult] = useState<ExerciseResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;

  const loadExercises = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const lang = getCurrentLanguage();
      const res = await aiEngineClient.post('/learning/exercises/generate', {
        topic,
        exercise_type: exerciseType,
        count: 5,
        langue: lang,
        difficulty: 1,
      });
      setExercises(res.data?.data || []);
      setCurrentIndex(0);
      setSelectedOption(null);
      setTextAnswer('');
      setResult(null);
      setScore(0);
      setCompleted(false);
    } catch (err) {
      setError(t('learn.errorLoadingExercises'));
    } finally {
      setIsLoading(false);
    }
  }, [topic, exerciseType]);

  React.useEffect(() => {
    loadExercises();
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const currentExercise = exercises[currentIndex];

  const handleSubmit = useCallback(async () => {
    if (!currentExercise) return;

    let answer: any = null;
    if (exerciseType === 'multiple_choice' || exerciseType === 'true_false') {
      answer = selectedOption;
    } else if (exerciseType === 'fill_blank' || exerciseType === 'open_question') {
      answer = textAnswer.trim();
    }

    if (answer === null && exerciseType !== 'open_question') return;
    if (exerciseType === 'open_question' && !textAnswer.trim()) return;

    try {
      const res = await aiEngineClient.post('/learning/exercises/submit', {
        exercise_id: currentExercise.id,
        lesson_id: 'standalone',
        answer: String(answer),
        child_id: activeChild?.id,
        session_id: 'exercise_session',
      });
      const exerciseResult: ExerciseResult = res.data?.data;
      setResult(exerciseResult);
      if (exerciseResult.is_correct) {
        setScore((prev) => prev + (currentExercise.points || 5));
      }
    } catch (err) {
      setResult({
        is_correct: false,
        correct_answer: null,
        explanation: t('learn.errorSubmitting'),
        points_earned: 0,
      });
    }
  }, [currentExercise, selectedOption, textAnswer, exerciseType, activeChild]);

  const handleNext = useCallback(() => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setTextAnswer('');
      setResult(null);
    } else {
      setCompleted(true);
    }
  }, [currentIndex, exercises.length]);

  const handleOptionPress = (index: number) => {
    if (result) return;
    setSelectedOption(index);
  };

  const getOptionStyle = (index: number) => {
    const isSelected = selectedOption === index;
    const isCorrectOption = result ? index === result.correct_answer : false;
    const isWrongSelected = result ? (isSelected && !result.is_correct) : false;

    const base: any = {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      padding: Spacing.md,
      borderRadius: BorderRadius.lg,
      borderWidth: 2,
      borderColor: Colors.gray200,
      backgroundColor: Colors.gray100,
    };

    if (result && isCorrectOption) {
      base.borderColor = Colors.success;
      base.backgroundColor = Colors.successSurface;
    } else if (isWrongSelected) {
      base.borderColor = Colors.danger;
      base.backgroundColor = Colors.danger + '10';
    } else if (isSelected && !result) {
      base.borderColor = Colors.primary;
      base.backgroundColor = Colors.primarySurface;
    }

    return base;
  };

  const getOptionTextStyle = (index: number) => {
    const isSelected = selectedOption === index;
    const isCorrectOption = result ? index === result.correct_answer : false;
    const isWrongSelected = result ? (isSelected && !result.is_correct) : false;

    const base: any = { flex: 1, fontSize: 16, fontWeight: '500', color: Colors.gray700 };
    if (isSelected || isCorrectOption) {
      base.color = isWrongSelected ? Colors.danger : Colors.white;
    }
    return base;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: true, headerTitle: t('learn.exercise'), headerBackTitle: t('common.back') }} />
        <View style={styles.center}>
          <Animated.View style={{ opacity: fadeIn }}>
            <Text style={styles.loadingText}>{t('learn.loading')}</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: true, headerTitle: t('learn.exercise'), headerBackTitle: t('common.back') }} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadExercises} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (completed) {
    const totalPoints = exercises.reduce((sum, ex) => sum + (ex.points || 5), 0);
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: true, headerTitle: t('learn.exercise'), headerBackTitle: t('common.back') }} />
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]}>
          <Animated.View style={[styles.completedContainer, { opacity: fadeIn }]}>
            <LinearGradient colors={[Colors.success, Colors.primary]} style={styles.completedCard}>
              <Text style={styles.completedEmoji}>🎉</Text>
              <Text style={styles.completedTitle}>{t('learn.exercisesCompleted')}</Text>
              <Text style={styles.completedScore}>
                {score}/{totalPoints} {t('common.points')}
              </Text>
              <TouchableOpacity style={styles.completedButton} onPress={() => router.back()} activeOpacity={0.85}>
                <Text style={styles.completedButtonText}>{t('common.back')}</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: true, headerTitle: t('learn.exercise'), headerBackTitle: t('common.back') }} />
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeIn }}>
          <View style={styles.progressHeader}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((currentIndex + (result ? 1 : 0)) / exercises.length) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{currentIndex + 1}/{exercises.length}</Text>
          </View>

          {currentExercise && (
            <View style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <View style={[styles.typeBadge, { backgroundColor: Colors.primary + '15' }]}>
                  <Text style={[styles.typeText, { color: Colors.primary }]}>
                    {exerciseType === 'multiple_choice' ? 'QCM' : exerciseType === 'true_false' ? t('learn.trueFalse') : exerciseType === 'fill_blank' ? t('learn.fillBlank') : t('learn.openQuestion')}
                  </Text>
                </View>
                <Text style={styles.pointsText}>+{currentExercise.points} pts</Text>
              </View>

              <Text style={styles.questionText}>{currentExercise.question}</Text>

              {(exerciseType === 'multiple_choice' || exerciseType === 'true_false') && (
                <View style={styles.optionsContainer}>
                  {(exerciseType === 'true_false' ? [t('learn.true'), t('learn.false')] : currentExercise.options).map((option: string, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={getOptionStyle(index)}
                      onPress={() => handleOptionPress(index)}
                      disabled={!!result}
                      activeOpacity={0.8}
                    >
                      {exerciseType === 'multiple_choice' && (
                        <View style={styles.optionLetter}>
                          <Text style={styles.optionLetterText}>{String.fromCharCode(65 + index)}</Text>
                        </View>
                      )}
                      <Text style={getOptionTextStyle(index)}>{option}</Text>
                      {result && index === result.correct_answer && (
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.success} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M20 6L9 17l-5-5" />
                        </Svg>
                      )}
                      {result && selectedOption === index && !result.is_correct && (
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.danger} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M18 6L6 18M6 6l12 12" />
                        </Svg>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {(exerciseType === 'fill_blank' || exerciseType === 'open_question') && (
                <View style={styles.textInputContainer}>
                  <TextInput
                    style={result ? styles.textInputDisabled : styles.textInput}
                    placeholder={exerciseType === 'fill_blank' ? t('learn.typeAnswer') : t('learn.writeAnswer')}
                    placeholderTextColor={Colors.gray400}
                    value={textAnswer}
                    onChangeText={setTextAnswer}
                    editable={!result}
                    multiline={exerciseType === 'open_question'}
                    numberOfLines={exerciseType === 'open_question' ? 4 : 1}
                    textAlignVertical={exerciseType === 'open_question' ? 'top' : 'center'}
                  />
                </View>
              )}

              {!result && (
                <TouchableOpacity
                  onPress={handleSubmit}
                  activeOpacity={0.85}
                  disabled={
                    (exerciseType === 'multiple_choice' || exerciseType === 'true_false') && selectedOption === null
                  }
                >
                  <LinearGradient
                    colors={
                      ((exerciseType === 'multiple_choice' || exerciseType === 'true_false') && selectedOption === null) ||
                      ((exerciseType === 'fill_blank' || exerciseType === 'open_question') && !textAnswer.trim())
                        ? [Colors.gray300, Colors.gray400]
                        : [Colors.primary, Colors.primaryDark]
                    }
                    style={styles.submitGradient}
                  >
                    <Text style={styles.submitText}>{t('learn.submit')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {result && (
                <View style={[styles.feedbackCard, { backgroundColor: result.is_correct ? Colors.successSurface : Colors.accentSurface }]}>
                  <View style={styles.feedbackHeader}>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={result.is_correct ? Colors.success : Colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      {result.is_correct ? (
                        <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4L12 14.01l-3-3" />
                      ) : (
                        <Path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" />
                      )}
                    </Svg>
                    <Text style={[styles.feedbackTitle, { color: result.is_correct ? Colors.success : Colors.accent }]}>
                      {result.is_correct ? t('learn.correct') : t('learn.incorrect')}
                    </Text>
                  </View>
                  <Text style={styles.feedbackExplanation}>{result.explanation}</Text>
                  {result.is_correct && <Text style={styles.feedbackPoints}>+{result.points_earned} {t('common.points')}</Text>}
                </View>
              )}

              {result && (
                <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.nextButtonContainer}>
                  <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.nextGradient}>
                    <Text style={styles.nextText}>
                      {currentIndex < exercises.length - 1 ? t('learn.nextExercise') : t('learn.finish')}
                    </Text>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M5 12h14M12 5l7 7-7 7" />
                    </Svg>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scrollContent: { flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  loadingText: { fontSize: 16, color: Colors.gray500 },
  errorText: { fontSize: 16, color: Colors.danger, textAlign: 'center', marginBottom: Spacing.md },
  retryButton: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, backgroundColor: Colors.primary, borderRadius: BorderRadius.xl },
  retryButtonText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  progressHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.md, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray200 },
  progressBar: { flex: 1, height: 6, backgroundColor: Colors.gray200, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  progressText: { fontSize: 13, fontWeight: '700', color: Colors.gray600 },

  exerciseCard: { margin: Spacing.base, padding: Spacing.lg, backgroundColor: Colors.white, borderRadius: BorderRadius['2xl'], ...Shadows.md, gap: Spacing.md },
  exerciseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  typeBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  typeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  pointsText: { fontSize: 14, fontWeight: '700', color: Colors.accent },
  questionText: { fontSize: 18, fontWeight: '700', color: Colors.black, lineHeight: 28 },

  optionsContainer: { gap: Spacing.sm },
  optionLetter: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' },
  optionLetterText: { fontSize: 14, fontWeight: '800', color: Colors.gray600 },

  textInputContainer: { gap: Spacing.md },
  textInput: { borderWidth: 2, borderColor: Colors.gray200, borderRadius: BorderRadius.lg, padding: Spacing.md, fontSize: 16, color: Colors.black, backgroundColor: Colors.gray100 },
  textInputDisabled: { borderWidth: 2, borderColor: Colors.gray200, borderRadius: BorderRadius.lg, padding: Spacing.md, fontSize: 16, color: Colors.gray400, backgroundColor: Colors.gray100, opacity: 0.5 },

  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.sm, borderRadius: BorderRadius.xl },
  submitText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  feedbackCard: { borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  feedbackTitle: { fontSize: 16, fontWeight: '800' },
  feedbackExplanation: { fontSize: 15, color: Colors.gray600, lineHeight: 22 },
  feedbackPoints: { fontSize: 14, fontWeight: '700', color: Colors.success, textAlign: 'right' },

  nextButtonContainer: { marginTop: Spacing.sm },
  nextGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.sm, borderRadius: BorderRadius.xl },
  nextText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  completedContainer: { padding: Spacing.xl },
  completedCard: { borderRadius: BorderRadius['2xl'], padding: Spacing['2xl'], alignItems: 'center', gap: Spacing.md },
  completedEmoji: { fontSize: 64 },
  completedTitle: { fontSize: 24, fontWeight: '800', color: Colors.white, textAlign: 'center' },
  completedScore: { fontSize: 18, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  completedButton: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.xl, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md, marginTop: Spacing.md },
  completedButtonText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});