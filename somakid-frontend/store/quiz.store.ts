import { create } from 'zustand';
import type { QuizQuestion, QuizSubject, QuizSubjectDefinition, Language } from '../types/api.types';
import { QuizService } from '../services/api/quiz.service';
import { extractErrorMessage } from '../services/api/client';

// Generates a stable session ID for the current app session.
// Resets only when the user explicitly calls resetSession().
function generateSessionId(): string {
  return `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface QuizState {
  currentQuestion: QuizQuestion | null;
  subjects: QuizSubjectDefinition[];
  selectedSubject: QuizSubject | null;
  difficultyLevel: number;
  score: number;
  questionsAnswered: number;
  correctAnswers: number;
  isGenerating: boolean;
  chosenAnswer: number | null;
  showExplanation: boolean;
  error: string | null;
  /** Stable session ID sent to the backend for per-session deduplication. */
  sessionId: string;

  loadSubjects: (language?: Language) => Promise<void>;
  selectSubject: (subject: QuizSubject) => void;
  setDifficulty: (level: number) => void;
  generateQuestion: (language?: Language) => Promise<void>;
  submitAnswer: (answerIndex: number) => void;
  nextQuestion: () => Promise<void>;
  startQuiz: (subject: QuizSubject, difficulty: number, language: Language) => Promise<void>;
  resetSession: () => void;
  clearError: () => void;
}

export const useQuizStore = create<QuizState>((set, get) => ({
  currentQuestion: null,
  subjects: [],
  selectedSubject: null,
  difficultyLevel: 1,
  score: 0,
  questionsAnswered: 0,
  correctAnswers: 0,
  isGenerating: false,
  chosenAnswer: null,
  showExplanation: false,
  error: null,
  sessionId: generateSessionId(),

  loadSubjects: async (language: Language = 'fr') => {
    try {
      const subjects = await QuizService.getSubjects(language);
      set({ subjects });
    } catch (error) {
      set({ error: extractErrorMessage(error) });
    }
  },

  selectSubject: (subject: QuizSubject) => {
    set({
      selectedSubject: subject,
      currentQuestion: null,
      chosenAnswer: null,
      showExplanation: false,
    });
  },

  setDifficulty: (level: number) => {
    if (level >= 1 && level <= 5) set({ difficultyLevel: level });
  },

  generateQuestion: async (language: Language = 'fr') => {
    const { selectedSubject, difficultyLevel, sessionId } = get();
    if (!selectedSubject) return;

    set({ isGenerating: true, error: null, chosenAnswer: null, showExplanation: false });
    try {
      const question = await QuizService.generateQuestion({
        subject: selectedSubject,
        level: difficultyLevel,
        language,
        // Pass sessionId so the backend can track + exclude previous questions
        sessionId,
      });
      set({ currentQuestion: question, isGenerating: false });
    } catch (error) {
      set({ isGenerating: false, error: extractErrorMessage(error) });
    }
  },

  startQuiz: async (subject: QuizSubject, difficulty: number = 1, language: Language = 'fr') => {
    // Keep the existing sessionId — do NOT reset it here so the dedup window
    // accumulates across the whole quiz run, not just the first question.
    set({
      selectedSubject: subject,
      difficultyLevel: difficulty,
      score: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      currentQuestion: null,
      chosenAnswer: null,
      showExplanation: false,
      error: null,
    });
    await get().loadSubjects(language);
    await get().generateQuestion(language);
  },

  submitAnswer: (answerIndex: number) => {
    const { currentQuestion } = get();
    if (!currentQuestion || get().chosenAnswer !== null) return;

    const isCorrect = currentQuestion.correctAnswer === answerIndex;
    const pointsEarned = isCorrect ? currentQuestion.points : 0;

    set((state) => ({
      chosenAnswer: answerIndex,
      score: state.score + pointsEarned,
      questionsAnswered: state.questionsAnswered + 1,
      correctAnswers: state.correctAnswers + (isCorrect ? 1 : 0),
      showExplanation: true,
    }));
  },

  nextQuestion: async () => {
    const { selectedSubject, difficultyLevel, sessionId } = get();
    if (!selectedSubject) return;

    set({ isGenerating: true, error: null, chosenAnswer: null, showExplanation: false });
    try {
      const question = await QuizService.generateQuestion({
        subject: selectedSubject,
        level: difficultyLevel,
        language: 'fr',
        // Always pass sessionId so backend keeps building the dedup window
        sessionId,
      });
      set({ currentQuestion: question, isGenerating: false });
    } catch (error) {
      set({ isGenerating: false, error: extractErrorMessage(error) });
    }
  },

  resetSession: () => {
    // Generate a fresh sessionId so the dedup window starts clean
    set({
      currentQuestion: null,
      selectedSubject: null,
      difficultyLevel: 1,
      score: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      chosenAnswer: null,
      showExplanation: false,
      error: null,
      sessionId: generateSessionId(),
    });
  },

  clearError: () => set({ error: null }),
}));