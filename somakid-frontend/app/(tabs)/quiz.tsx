/**
 * SOMAKID AI - Quiz Screen
 * Interactive quiz with voice feedback, subject selection, and elegant animations.
 * Subjects reload automatically when user changes language.
 * 
 * VERSION FINALE CORRIGÉE - Avec gestion anti-conflit audio
 * - TTS: /api/v1/voice/synthesize-direct
 * - Anti-conflit audio: une seule lecture audio à la fois
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuiz } from '../../hooks/useQuiz';
import { useTranslation } from '../../hooks/useTranslation';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { formatPoints } from '../../utils/formatting';
import { aiEngineClient } from '../../services/api/client';
import { getCurrentLanguage, onLanguageChange } from '../../i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import { QuizSubject } from '../../types/api.types';
import Svg, { Path } from 'react-native-svg';
import { playAudioBase64, stopCurrentAudio, isAudioPlaying } from '../../utils/media';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

// =============================================================================
// Text-to-Speech using /voice/synthesize-direct endpoint avec anti-conflit
// =============================================================================
async function speakText(text: string, langue: string = 'fr'): Promise<void> {
  if (!text || text.trim().length < 3) return;
  try {
    const res = await aiEngineClient.post('/voice/synthesize-direct', {
      texte: text.trim(),
      langue: langue,
    });
    const audioB64 = res.data?.data?.audio_base64;
    if (audioB64 && audioB64.length > 100) {
      await playAudioBase64(audioB64);
    }
  } catch (e) {
    console.warn('TTS error:', e);
  }
}

function SubjectSelector({
  subjects,
  selected,
  onSelect,
}: {
  subjects: any[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.subjectGrid}>
      {subjects.map((subject) => (
        <TouchableOpacity
          key={subject.id}
          onPress={() => onSelect(subject.id)}
          activeOpacity={0.8}
          style={[
            styles.subjectCard,
            selected === subject.id && { borderColor: subject.color, borderWidth: 3 },
          ]}
        >
          <LinearGradient
            colors={
              selected === subject.id
                ? [subject.color, subject.color + 'DD']
                : [Colors.white, Colors.gray100]
            }
            style={styles.subjectGradient}
          >
            <Text style={styles.subjectEmoji}>{subject.emoji}</Text>
            <Text
              style={[
                styles.subjectName,
                { color: selected === subject.id ? Colors.white : Colors.black },
              ]}
              numberOfLines={2}
            >
              {subject.name}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function QuizQuestionCard({
  onQuestionRead,
  t,
}: {
  onQuestionRead?: () => void;
  t: (key: string) => string;
}) {
  const {
    currentQuestion,
    chosenAnswer,
    showExplanation,
    isCurrentAnswerCorrect,
    labeledOptions,
    answerQuestion,
  } = useQuiz();

  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const hasPlayedRef = useRef<string | null>(null);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [currentQuestion]);

  useEffect(() => {
    if (!currentQuestion) return;
    if (hasPlayedRef.current === currentQuestion.id) return;
    hasPlayedRef.current = currentQuestion.id;

    if (currentQuestion.audioBase64 && currentQuestion.audioBase64.length > 100) {
      playAudioBase64(currentQuestion.audioBase64).then(() => {
        onQuestionRead?.();
      });
    } else {
      onQuestionRead?.();
    }
  }, [currentQuestion?.id]);

  if (!currentQuestion) return null;

  return (
    <Animated.View style={[styles.quizCard, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.quizHeader}>
        <Text style={styles.quizEmoji}>{currentQuestion.subjectEmoji}</Text>
        <View style={styles.quizPoints}>
          <Text style={styles.quizPointsText}>
            {formatPoints(currentQuestion.points)} {t('common.points')}
          </Text>
        </View>
      </View>

      <Text style={styles.quizQuestion}>{currentQuestion.question}</Text>

      <View style={styles.optionsContainer}>
        {labeledOptions.map((option) => {
          const isSelected = option.isChosen;
          const isRevealed = showExplanation;
          const isCorrectOption = option.isCorrect;
          const optionStylesList: any[] = [styles.option];
          if (isRevealed && isCorrectOption) optionStylesList.push(styles.optionCorrect);
          else if (isSelected && !isCorrectOption) optionStylesList.push(styles.optionWrong);
          else if (isRevealed && !isSelected) optionStylesList.push(styles.optionNeutral);

          return (
            <TouchableOpacity
              key={option.index}
              onPress={() => answerQuestion(option.index)}
              disabled={chosenAnswer !== null}
              activeOpacity={0.8}
              style={optionStylesList}
            >
              <View style={styles.optionLetterBadge}>
                <Text style={styles.optionLetter}>{option.label}</Text>
              </View>
              <Text
                style={[
                  styles.optionText,
                  (isSelected || (isRevealed && isCorrectOption)) && { color: Colors.white },
                ]}
              >
                {option.text}
              </Text>
              {isRevealed && isCorrectOption && (
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M20 6L9 17l-5-5" />
                </Svg>
              )}
              {isSelected && !isCorrectOption && (
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M18 6L6 18M6 6l12 12" />
                </Svg>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {showExplanation && (
        <View
          style={[
            styles.explanationCard,
            {
              backgroundColor: isCurrentAnswerCorrect
                ? Colors.successSurface
                : Colors.accentSurface,
            },
          ]}
        >
          <Text style={styles.explanationTitle}>
            {isCurrentAnswerCorrect ? t('quiz.correct') : t('quiz.incorrect')}
          </Text>
          <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
          {currentQuestion.bonusFact && (
            <Text style={styles.bonusFact}>{t('quiz.bonus')}: {currentQuestion.bonusFact}</Text>
          )}
        </View>
      )}
    </Animated.View>
  );
}

export default function QuizScreen() {
  const { t } = useTranslation();
  const {
    subjects,
    selectedSubject,
    difficultyLevel,
    score,
    questionsAnswered,
    accuracy,
    isGenerating,
    hasQuestion,
    hasSubject,
    hasAnswered,
    loadSubjects,
    startQuiz,
    selectSubject,
    setDifficulty,
    goToNextQuestion,
    resetSession,
    error,
    clearError,
    currentQuestion,
    showExplanation,
    isCurrentAnswerCorrect,
  } = useQuiz();

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isReadingQuestion, setIsReadingQuestion] = useState(false);
  const explanationSpokenRef = useRef<string | null>(null);
  const currentLangRef = useRef<string>(getCurrentLanguage());

  // Nettoyer l'audio au démontage du composant
  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, []);

  useEffect(() => {
    const loadForLanguage = (lang: string) => {
      currentLangRef.current = lang;
      loadSubjects(lang as any);
    };

    loadForLanguage(getCurrentLanguage());

    const unsubscribe = onLanguageChange((lang: string) => {
      loadForLanguage(lang);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!showExplanation || !currentQuestion) return;
    const key = `${currentQuestion.id}-${isCurrentAnswerCorrect}`;
    if (explanationSpokenRef.current === key) return;
    explanationSpokenRef.current = key;

    const lang = currentLangRef.current;
    const feedback = isCurrentAnswerCorrect
      ? `${t('quiz.correct')}! ${currentQuestion.explanation}`
      : `${t('quiz.incorrect')}. ${currentQuestion.explanation}`;

    setIsSpeaking(true);
    speakText(feedback, lang).finally(() => {
      setIsSpeaking(false);
    });
  }, [showExplanation, currentQuestion?.id, t]);

  const handleReplayQuestion = useCallback(async () => {
    if (!currentQuestion) return;
    setIsReadingQuestion(true);
    const lang = currentLangRef.current;
    if (currentQuestion.audioBase64 && currentQuestion.audioBase64.length > 100) {
      await playAudioBase64(currentQuestion.audioBase64);
    } else {
      await speakText(currentQuestion.question, lang);
    }
    setIsReadingQuestion(false);
  }, [currentQuestion]);

  const handleStartQuiz = useCallback(() => {
    if (selectedSubject) {
      const lang = currentLangRef.current;
      startQuiz(selectedSubject as QuizSubject, difficultyLevel, lang as any);
    }
  }, [selectedSubject, difficultyLevel, startQuiz]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={true}
      >
        <LinearGradient
          colors={[Colors.gradients.quizStart, Colors.gradients.quizEnd]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </Svg>
            <View>
              <Text style={styles.headerTitle}>{t('quiz.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('quiz.subtitle')}</Text>
            </View>
          </View>
          {questionsAnswered > 0 && (
            <View style={styles.scoreRow}>
              <Text style={styles.scoreText}>
                {t('quiz.score')} : {formatPoints(score)} {t('common.points')} · {questionsAnswered} {t('quiz.answers')} · {accuracy}%
              </Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.content}>
          {error && <ErrorDisplay message={error} onRetry={() => clearError()} />}

          {!hasQuestion && !isGenerating && !error && (
            <>
              <Text style={styles.sectionTitle}>{t('quiz.chooseSubject')}</Text>
              <SubjectSelector
                subjects={subjects}
                selected={selectedSubject}
                onSelect={(id) => selectSubject(id as QuizSubject)}
              />

              {hasSubject && (
                <>
                  <Text style={styles.sectionTitle}>{t('quiz.difficulty')}</Text>
                  <View style={styles.levelRow}>
                    {[1, 2, 3, 4, 5].map((level) => (
                      <TouchableOpacity
                        key={level}
                        onPress={() => setDifficulty(level)}
                        style={[
                          styles.levelButton,
                          difficultyLevel === level && {
                            backgroundColor: Colors.accent,
                            borderColor: Colors.accent,
                          },
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.levelButtonText,
                            difficultyLevel === level && { color: Colors.white },
                          ]}
                        >
                          {'⭐'.repeat(level)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.startButton}
                    onPress={handleStartQuiz}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[Colors.accent, Colors.gradients.quizStart]}
                      style={styles.startButtonGradient}
                    >
                      <Text style={styles.startButtonText}>{t('quiz.start')}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {isGenerating && (
            <View style={styles.generatingContainer}>
              <LoadingSpinner
                message={t('quiz.preparingQuestion')}
                color={Colors.accent}
              />
            </View>
          )}

          {hasQuestion && !isGenerating && (
            <>
              {isReadingQuestion && (
                <View style={styles.readingBadge}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#2B6CB0" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                    <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <Path d="M12 19v4" />
                    <Path d="M8 23h8" />
                  </Svg>
                  <Text style={styles.readingBadgeText}>{t('quiz.readingQuestion')}</Text>
                </View>
              )}

              <QuizQuestionCard
                onQuestionRead={() => setIsReadingQuestion(false)}
                t={t}
              />

              <TouchableOpacity
                style={styles.replayButton}
                onPress={handleReplayQuestion}
                disabled={isReadingQuestion || isSpeaking}
                activeOpacity={0.8}
              >
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.gray600} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                  <Path d="M1 4v6h6" />
                  <Path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </Svg>
                <Text style={styles.replayButtonText}>
                  {isReadingQuestion ? t('quiz.listening') : t('quiz.replayQuestion')}
                </Text>
              </TouchableOpacity>

              {isSpeaking && (
                <View style={styles.speakingBadge}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#276749" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                    <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </Svg>
                  <Text style={styles.speakingBadgeText}>{t('quiz.teacherExplaining')}</Text>
                </View>
              )}

              {!hasAnswered && (
                <View style={styles.tapHint}>
                  <Text style={styles.tapHintText}>
                    {t('quiz.tapToAnswer')}
                  </Text>
                </View>
              )}

              {hasAnswered && (
                <TouchableOpacity
                  style={[styles.nextButton, isSpeaking && { opacity: 0.6 }]}
                  onPress={goToNextQuestion}
                  activeOpacity={0.85}
                  disabled={isSpeaking}
                >
                  <Text style={styles.nextButtonText}>
                    {isSpeaking ? t('quiz.waitExplanation') : t('quiz.nextQuestion')}
                  </Text>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M5 12h14M12 5l7 7-7 7" />
                  </Svg>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetSession}
                activeOpacity={0.7}
              >
                <Text style={styles.resetButtonText}>{t('quiz.changeSubject')}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scroll: { flexGrow: 1 },

  header: { padding: Spacing.xl, paddingTop: Spacing.lg },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 4,
  },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  scoreRow: { marginTop: Spacing.sm },
  scoreText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '700',
  },

  content: { padding: Spacing.base },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.black,
    marginBottom: Spacing.md,
    marginTop: Spacing.md,
  },

  generatingContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },

  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  subjectCard: {
    width: '47%',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  subjectGradient: {
    padding: Spacing.base,
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 100,
    justifyContent: 'center',
  },
  subjectEmoji: { fontSize: 38 },
  subjectName: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  levelRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  levelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray200,
    ...Shadows.sm,
  },
  levelButtonText: { fontSize: 14 },

  startButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginTop: Spacing.lg,
    ...Shadows.colored(Colors.accent),
  },
  startButtonGradient: { padding: Spacing.lg, alignItems: 'center' },
  startButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.white,
  },

  quizCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    padding: Spacing.xl,
    gap: Spacing.md,
    ...Shadows.md,
  },
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quizEmoji: { fontSize: 44 },
  quizPoints: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  quizPointsText: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.earthLight,
  },
  quizQuestion: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.black,
    lineHeight: 28,
  },

  optionsContainer: { gap: Spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
  },
  optionCorrect: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionWrong: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  optionNeutral: { opacity: 0.4 },
  optionLetterBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetter: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.gray600,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: Colors.black,
    fontWeight: '500',
  },

  explanationCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.black,
  },
  explanationText: {
    fontSize: 16,
    color: Colors.gray600,
    lineHeight: 22,
  },
  bonusFact: {
    fontSize: 14,
    color: Colors.primary,
    fontStyle: 'italic',
  },

  replayButton: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    ...Shadows.sm,
  },
  replayButtonText: {
    fontSize: 14,
    color: Colors.gray600,
    fontWeight: '600',
  },

  readingBadge: {
    backgroundColor: '#EBF8FF',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  readingBadgeText: {
    fontSize: 14,
    color: '#2B6CB0',
    fontWeight: '700',
  },
  speakingBadge: {
    backgroundColor: '#F0FFF4',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  speakingBadgeText: {
    fontSize: 14,
    color: '#276749',
    fontWeight: '700',
  },

  tapHint: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    ...Shadows.sm,
  },
  tapHintText: {
    fontSize: 15,
    color: Colors.gray600,
    fontWeight: '600',
  },

  nextButton: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    ...Shadows.sm,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accent,
  },
  resetButton: {
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  resetButtonText: {
    fontSize: 14,
    color: Colors.gray500,
    fontWeight: '500',
  },
});