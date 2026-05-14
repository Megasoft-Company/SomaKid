/**
 * SOMAKID AI - Learning Hook
 * React hook for structured learning paths, units, lessons, and exercises.
 */

import { useCallback, useMemo } from 'react';
import { useLearningStore } from '../store/learning.store';
import type { Unit, Lesson, Exercise, ExerciseResult, UnitTest } from '../store/learning.store';

export function useLearning() {
  const store = useLearningStore();

  const totalPaths = useMemo(() => store.paths.length, [store.paths]);
  const totalUnits = useMemo(() => store.units.length, [store.units]);
  const totalExercises = useMemo(() => store.currentExercises.length, [store.currentExercises]);

  const hasPaths = useMemo(() => store.paths.length > 0, [store.paths]);
  const hasUnits = useMemo(() => store.units.length > 0, [store.units]);
  const hasLesson = useMemo(() => store.currentLesson !== null, [store.currentLesson]);
  const hasTest = useMemo(() => store.currentTest !== null, [store.currentTest]);

  const isLessonCompleted = useMemo(() => store.lessonCompleted, [store.lessonCompleted]);
  const isTestPassed = useMemo(() => store.currentTest?.passed ?? false, [store.currentTest]);

  const correctExercises = useMemo(() => {
    return Array.from(store.exerciseResults.values()).filter((r: ExerciseResult) => r.is_correct).length;
  }, [store.exerciseResults]);

  const totalPoints = useMemo(() => {
    return Array.from(store.exerciseResults.values()).reduce((sum: number, r: ExerciseResult) => sum + r.points_earned, 0);
  }, [store.exerciseResults]);

  const currentExercise = useMemo(() => {
    if (store.currentExercises.length === 0) return null;
    return store.currentExercises[store.currentExerciseIndex] || null;
  }, [store.currentExercises, store.currentExerciseIndex]);

  const currentResult = useMemo(() => {
    if (!currentExercise) return null;
    return store.exerciseResults.get(currentExercise.id) || null;
  }, [currentExercise, store.exerciseResults]);

  const isCurrentAnswered = useMemo(() => currentResult !== null, [currentResult]);

  const loadPaths = useCallback(async () => {
    await store.loadPaths();
  }, [store]);

  const loadPathDetail = useCallback(async (pathId: string) => {
    await store.loadPathDetail(pathId);
  }, [store]);

  const selectPath = useCallback((pathId: string) => {
    store.selectPath(pathId);
  }, [store]);

  const loadUnits = useCallback(async (pathId: string) => {
    await store.loadUnits(pathId);
  }, [store]);

  const selectUnit = useCallback((unit: Unit) => {
    store.selectUnit(unit);
  }, [store]);

  const generateLesson = useCallback(async (pathId: string, unitNumber: number, lessonNumber: number) => {
    await store.generateLesson(pathId, unitNumber, lessonNumber);
  }, [store]);

  const completeLesson = useCallback(async (lessonId: string, unitId: string, pathId: string, score: number) => {
    await store.completeLesson(lessonId, unitId, pathId, score);
  }, [store]);

  const submitExercise = useCallback(async (exerciseId: string, lessonId: string, answer: any): Promise<ExerciseResult> => {
    return await store.submitExercise(exerciseId, lessonId, answer);
  }, [store]);

  const nextExercise = useCallback(() => {
    store.nextExercise();
  }, [store]);

  const resetExercises = useCallback(() => {
    store.resetExercises();
  }, [store]);

  const generateUnitTest = useCallback(async (pathId: string, unitNumber: number) => {
    await store.generateUnitTest(pathId, unitNumber);
  }, [store]);

  const submitUnitTest = useCallback(async (testId: string, unitId: string, pathId: string, answers: string[]) => {
    return await store.submitUnitTest(testId, unitId, pathId, answers);
  }, [store]);

  const loadProgress = useCallback(async (childId: string, pathId?: string) => {
    await store.loadProgress(childId, pathId);
  }, [store]);

  return {
    paths: store.paths,
    selectedPath: store.selectedPath,
    units: store.units,
    selectedUnit: store.selectedUnit,
    currentLesson: store.currentLesson,
    currentExercises: store.currentExercises,
    currentTest: store.currentTest,
    progress: store.progress,
    isLoading: store.isLoading,
    isGenerating: store.isGenerating,
    error: store.error,
    currentExerciseIndex: store.currentExerciseIndex,
    showContent: store.showContent,
    lessonCompleted: store.lessonCompleted,
    totalPaths,
    totalUnits,
    totalExercises,
    hasPaths,
    hasUnits,
    hasLesson,
    hasTest,
    isLessonCompleted,
    isTestPassed,
    correctExercises,
    totalPoints,
    currentExercise,
    currentResult,
    isCurrentAnswered,
    loadPaths,
    loadPathDetail,
    selectPath,
    loadUnits,
    selectUnit,
    generateLesson,
    completeLesson,
    submitExercise,
    nextExercise,
    resetExercises,
    generateUnitTest,
    submitUnitTest,
    loadProgress,
    clearError: store.clearError,
    setShowContent: store.setShowContent,
    reset: store.reset,
  };
}