/**
 * SOMAKID AI - Learning Store
 * Zustand store for managing learning paths, units, lessons, and child progression.
 * Inspired by Duolingo's gamified learning structure.
 */

import { create } from 'zustand';
import { aiEngineClient, extractErrorMessage } from '../services/api/client';
import { getCurrentLanguage } from '../i18n';

// =============================================================================
// Types
// =============================================================================

export interface LearningPath {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  total_units: number;
  progress: number;
  order_index: number;
}

export interface PathDetail extends LearningPath {
  child_progress?: {
    total_lessons_completed: number;
    total_units_completed: number;
    total_tests_passed: number;
    total_points_earned: number;
    streak_days: number;
    overall_progress: number;
  };
}

export interface Unit {
  id: string;
  path_id?: string;
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

export interface Lesson {
  id: string;
  unit_id?: string;
  lesson_number: number;
  title: string;
  content: string;
  summary: string;
  lesson_type: 'theory' | 'practice' | 'review' | 'exam';
  key_points: string[];
  vocabulary: { word: string; definition: string }[];
  exercises: Exercise[];
  fun_fact: string;
  practical_tip: string;
  emoji: string;
  difficulty: number;
  estimated_minutes: number;
  is_completed: boolean;
  is_locked: boolean;
}

export interface Exercise {
  id: string;
  exercise_type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'open_question' | 'matching' | 'image_identification';
  question: string;
  options: string[];
  correct_answer?: any;
  explanation: string;
  keywords?: string[];
  points: number;
  order_index: number;
}

export interface ExerciseResult {
  exercise_id: string;
  is_correct: boolean;
  correct_answer: any;
  explanation: string;
  points_earned: number;
}

export interface UnitTest {
  id: string;
  unit_id: string;
  path_id: string;
  title: string;
  questions: Exercise[];
  passing_score: number;
  total_questions: number;
  score?: number;
  passed: boolean;
  attempt_count: number;
}

export interface ChildProgress {
  child_id: string;
  path_id: string;
  current_unit_number: number;
  current_lesson_number: number;
  total_lessons_completed: number;
  total_units_completed: number;
  total_tests_passed: number;
  total_points_earned: number;
  streak_days: number;
  overall_progress: number;
}

// =============================================================================
// Store State
// =============================================================================

interface LearningState {
  // Data
  paths: LearningPath[];
  selectedPath: PathDetail | null;
  units: Unit[];
  selectedUnit: Unit | null;
  currentLesson: Lesson | null;
  currentExercises: Exercise[];
  currentTest: UnitTest | null;
  exerciseResults: Map<string, ExerciseResult>;
  progress: ChildProgress | null;

  // UI State
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  currentExerciseIndex: number;
  showContent: boolean;
  lessonCompleted: boolean;

  // Actions - Paths
  loadPaths: () => Promise<void>;
  loadPathDetail: (pathId: string) => Promise<void>;
  selectPath: (pathId: string) => void;

  // Actions - Units
  loadUnits: (pathId: string) => Promise<void>;
  selectUnit: (unit: Unit) => void;

  // Actions - Lessons
  generateLesson: (pathId: string, unitNumber: number, lessonNumber: number) => Promise<void>;
  loadLesson: (lessonId: string) => Promise<void>;
  completeLesson: (lessonId: string, unitId: string, pathId: string, score: number) => Promise<void>;

  // Actions - Exercises
  submitExercise: (exerciseId: string, lessonId: string, answer: any) => Promise<ExerciseResult>;
  nextExercise: () => void;
  resetExercises: () => void;

  // Actions - Unit Tests
  generateUnitTest: (pathId: string, unitNumber: number) => Promise<void>;
  submitUnitTest: (testId: string, unitId: string, pathId: string, answers: string[]) => Promise<void>;

  // Actions - Progress
  loadProgress: (childId: string, pathId?: string) => Promise<void>;

  // Utility
  clearError: () => void;
  setShowContent: (show: boolean) => void;
  reset: () => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialState = {
  paths: [],
  selectedPath: null,
  units: [],
  selectedUnit: null,
  currentLesson: null,
  currentExercises: [],
  currentTest: null,
  exerciseResults: new Map<string, ExerciseResult>(),
  progress: null,
  isLoading: false,
  isGenerating: false,
  error: null,
  currentExerciseIndex: 0,
  showContent: true,
  lessonCompleted: false,
};

// =============================================================================
// Store
// =============================================================================

export const useLearningStore = create<LearningState>((set, get) => ({
  ...initialState,

  // ── Paths ──────────────────────────────────────────────────────────────

  loadPaths: async () => {
    set({ isLoading: true, error: null });
    try {
      const lang = getCurrentLanguage();
      const res = await aiEngineClient.get('/learning/paths', {
        params: { language: lang },
      });
      set({ paths: res.data?.data || [], isLoading: false });
    } catch (err) {
      set({ error: extractErrorMessage(err), isLoading: false });
    }
  },

  loadPathDetail: async (pathId: string) => {
    set({ isLoading: true, error: null });
    try {
      const lang = getCurrentLanguage();
      const res = await aiEngineClient.get(`/learning/paths/${pathId}`, {
        params: { language: lang },
      });
      set({ selectedPath: res.data?.data, isLoading: false });
    } catch (err) {
      set({ error: extractErrorMessage(err), isLoading: false });
    }
  },

  selectPath: (pathId: string) => {
    const path = get().paths.find((p) => p.id === pathId || p.slug === pathId);
    if (path) {
      set({ selectedPath: path as PathDetail, units: [], selectedUnit: null });
    }
  },

  // ── Units ──────────────────────────────────────────────────────────────

  loadUnits: async (pathId: string) => {
    set({ isLoading: true, error: null });
    try {
      const lang = getCurrentLanguage();
      const res = await aiEngineClient.get(`/learning/paths/${pathId}/units`, {
        params: { language: lang },
      });
      set({ units: res.data?.data || [], isLoading: false });
    } catch (err) {
      set({ error: extractErrorMessage(err), isLoading: false });
    }
  },

  selectUnit: (unit: Unit) => {
    set({ selectedUnit: unit, currentLesson: null, currentExercises: [], exerciseResults: new Map() });
  },

  // ── Lessons ────────────────────────────────────────────────────────────

  generateLesson: async (pathId: string, unitNumber: number, lessonNumber: number) => {
    set({ isGenerating: true, error: null });
    try {
      const lang = getCurrentLanguage();
      const res = await aiEngineClient.post('/learning/lessons/generate', {
        path_id: pathId,
        unit_number: unitNumber,
        lesson_number: lessonNumber,
        langue: lang,
        child_age: 8,
        child_level: 1,
      });
      const lesson = res.data?.data;
      set({
        currentLesson: lesson,
        currentExercises: lesson?.exercises || [],
        currentExerciseIndex: 0,
        exerciseResults: new Map(),
        showContent: true,
        lessonCompleted: false,
        isGenerating: false,
      });
    } catch (err) {
      set({ error: extractErrorMessage(err), isGenerating: false });
    }
  },

  loadLesson: async (lessonId: string) => {
    set({ isLoading: true, error: null });
    try {
      const lang = getCurrentLanguage();
      const res = await aiEngineClient.get(`/learning/lessons/${lessonId}`, {
        params: { language: lang },
      });
      const lesson = res.data?.data;
      set({
        currentLesson: lesson,
        currentExercises: lesson?.exercises || [],
        currentExerciseIndex: 0,
        exerciseResults: new Map(),
        showContent: true,
        lessonCompleted: false,
        isLoading: false,
      });
    } catch (err) {
      set({ error: extractErrorMessage(err), isLoading: false });
    }
  },

  completeLesson: async (lessonId: string, unitId: string, pathId: string, score: number) => {
    try {
      await aiEngineClient.post('/learning/lessons/complete', {
        lesson_id: lessonId,
        unit_id: unitId,
        path_id: pathId,
        child_id: 'current',
        score,
        time_spent_seconds: 0,
      });
      set({ lessonCompleted: true });
    } catch (err) {
      set({ error: extractErrorMessage(err) });
    }
  },

  // ── Exercises ──────────────────────────────────────────────────────────

  submitExercise: async (exerciseId: string, lessonId: string, answer: any) => {
    try {
      const res = await aiEngineClient.post('/learning/exercises/submit', {
        exercise_id: exerciseId,
        lesson_id: lessonId,
        answer: String(answer),
        child_id: 'current',
        session_id: `lesson_${lessonId}`,
      });

      const result: ExerciseResult = res.data?.data;
      set((state) => {
        const updated = new Map(state.exerciseResults);
        updated.set(exerciseId, result);
        return { exerciseResults: updated };
      });
      return result;
    } catch (err) {
      const fallback: ExerciseResult = {
        exercise_id: exerciseId,
        is_correct: false,
        correct_answer: null,
        explanation: 'Error submitting answer',
        points_earned: 0,
      };
      set((state) => {
        const updated = new Map(state.exerciseResults);
        updated.set(exerciseId, fallback);
        return { exerciseResults: updated };
      });
      return fallback;
    }
  },

  nextExercise: () => {
    const { currentExerciseIndex, currentExercises } = get();
    if (currentExerciseIndex < currentExercises.length - 1) {
      set({ currentExerciseIndex: currentExerciseIndex + 1 });
    }
  },

  resetExercises: () => {
    set({ currentExerciseIndex: 0, exerciseResults: new Map(), lessonCompleted: false });
  },

  // ── Unit Tests ─────────────────────────────────────────────────────────

  generateUnitTest: async (pathId: string, unitNumber: number) => {
    set({ isGenerating: true, error: null });
    try {
      const lang = getCurrentLanguage();
      const res = await aiEngineClient.post('/learning/tests/generate', {
        path_id: pathId,
        unit_number: unitNumber,
        langue: lang,
        question_count: 10,
      });
      set({ currentTest: res.data?.data, isGenerating: false });
    } catch (err) {
      set({ error: extractErrorMessage(err), isGenerating: false });
    }
  },

  submitUnitTest: async (testId: string, unitId: string, pathId: string, answers: string[]) => {
    try {
      const res = await aiEngineClient.post('/learning/tests/submit', {
        test_id: testId,
        unit_id: unitId,
        path_id: pathId,
        answers,
        child_id: 'current',
        time_spent_seconds: 0,
      });
      const result = res.data?.data;
      set((state) => ({
        currentTest: state.currentTest
          ? { ...state.currentTest, score: result?.score, passed: result?.passed }
          : null,
      }));
      return result;
    } catch (err) {
      set({ error: extractErrorMessage(err) });
      return null;
    }
  },

  // ── Progress ───────────────────────────────────────────────────────────

  loadProgress: async (childId: string, pathId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const url = pathId
        ? `/learning/progress/${childId}?path_id=${pathId}`
        : `/learning/progress/${childId}`;
      const res = await aiEngineClient.get(url);
      set({ progress: res.data?.data, isLoading: false });
    } catch (err) {
      set({ error: extractErrorMessage(err), isLoading: false });
    }
  },

  // ── Utility ────────────────────────────────────────────────────────────

  clearError: () => set({ error: null }),
  setShowContent: (show: boolean) => set({ showContent: show }),
  reset: () => set(initialState),
}));