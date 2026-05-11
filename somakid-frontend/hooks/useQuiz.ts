import { useCallback, useMemo } from 'react';
import { useQuizStore } from '../store/quiz.store';
import type { QuizSubject, Language } from '../types/api.types';

export function useQuiz() {
  const store = useQuizStore();

  const accuracy = useMemo(() => {
    if (store.questionsAnswered === 0) return 0;
    return Math.round((store.correctAnswers / store.questionsAnswered) * 100);
  }, [store.correctAnswers, store.questionsAnswered]);

  const hasSubject = useMemo(() => store.selectedSubject !== null, [store.selectedSubject]);
  const hasQuestion = useMemo(() => store.currentQuestion !== null, [store.currentQuestion]);
  const hasAnswered = useMemo(() => store.chosenAnswer !== null, [store.chosenAnswer]);

  const isCurrentAnswerCorrect = useMemo(() => {
    if (!store.currentQuestion || store.chosenAnswer === null) return null;
    return store.chosenAnswer === store.currentQuestion.correctAnswer;
  }, [store.currentQuestion, store.chosenAnswer]);

  const labeledOptions = useMemo(() => {
    if (!store.currentQuestion) return [];
    const labels = ['A', 'B', 'C', 'D'];
    return store.currentQuestion.options.map((option, index) => ({
      label: labels[index],
      text: option,
      index,
      isCorrect: store.showExplanation ? index === store.currentQuestion!.correctAnswer : null,
      isChosen: store.chosenAnswer === index,
    }));
  }, [store.currentQuestion, store.chosenAnswer, store.showExplanation]);

  const startQuiz = useCallback(async (subject: QuizSubject, difficulty: number = 1, language: Language = 'fr') => {
    await store.startQuiz(subject, difficulty, language);
  }, [store]);

  const answerQuestion = useCallback((answerIndex: number) => {
    if (store.chosenAnswer !== null) return;
    store.submitAnswer(answerIndex);
  }, [store]);

  const goToNextQuestion = useCallback(async () => {
    await store.nextQuestion();
  }, [store]);

  return {
    currentQuestion: store.currentQuestion,
    subjects: store.subjects,
    selectedSubject: store.selectedSubject,
    difficultyLevel: store.difficultyLevel,
    score: store.score,
    questionsAnswered: store.questionsAnswered,
    correctAnswers: store.correctAnswers,
    isGenerating: store.isGenerating,
    chosenAnswer: store.chosenAnswer,
    showExplanation: store.showExplanation,
    error: store.error,
    accuracy,
    hasSubject,
    hasQuestion,
    hasAnswered,
    isCurrentAnswerCorrect,
    labeledOptions,
    loadSubjects: store.loadSubjects,
    startQuiz,
    answerQuestion,
    goToNextQuestion,
    selectSubject: store.selectSubject,
    setDifficulty: store.setDifficulty,
    resetSession: store.resetSession,
    clearError: store.clearError,
  };
}