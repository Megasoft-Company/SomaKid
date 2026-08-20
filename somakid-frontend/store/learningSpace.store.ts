/**
 * SOMAKID AI - Learning Space Store
 * Local, persisted state for the Courses/Library spaces: enrollments and
 * saved books. Runs entirely on-device (AsyncStorage) since there is no
 * backend for Courses/Library yet — mirrors the mock-data approach already
 * used in auth.store.ts.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LearningSpaceState {
  enrolledCourseIds: string[];
  savedBookIds: string[];
  courseProgress: Record<string, number>;

  enrollInCourse: (courseId: string) => void;
  unenrollFromCourse: (courseId: string) => void;
  toggleSavedBook: (bookId: string) => void;
}

export const useLearningSpaceStore = create<LearningSpaceState>()(
  persist(
    (set, get) => ({
      enrolledCourseIds: [],
      savedBookIds: [],
      courseProgress: {},

      enrollInCourse: (courseId) => {
        if (get().enrolledCourseIds.includes(courseId)) return;
        set((state) => ({
          enrolledCourseIds: [...state.enrolledCourseIds, courseId],
          courseProgress: { ...state.courseProgress, [courseId]: 0 },
        }));
      },

      unenrollFromCourse: (courseId) => {
        set((state) => ({
          enrolledCourseIds: state.enrolledCourseIds.filter((id) => id !== courseId),
        }));
      },

      toggleSavedBook: (bookId) => {
        set((state) => ({
          savedBookIds: state.savedBookIds.includes(bookId)
            ? state.savedBookIds.filter((id) => id !== bookId)
            : [...state.savedBookIds, bookId],
        }));
      },
    }),
    {
      name: 'somakid_learning_space',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
