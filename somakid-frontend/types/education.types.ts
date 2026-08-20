/**
 * SOMAKID AI - Education Space Types
 * Types for Courses, Library and Institutions.
 * These spaces run on local mock data (no backend yet) — kept separate from
 * api.types.ts, which describes real backend contracts.
 */

export type CourseCategory = 'biodiversity' | 'climate' | 'health' | 'coding';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface Tutor {
  id: string;
  name: string;
  avatarEmoji: string;
  bio: string;
}

export interface CourseModule {
  id: string;
  title: string;
  lessonTitles: string[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  category: CourseCategory;
  level: CourseLevel;
  tutor: Tutor;
  durationWeeks: number;
  priceUSD: number;
  isFree: boolean;
  curriculum: CourseModule[];
  institutionId?: string;
}

export type BookCategory = 'story' | 'science' | 'health' | 'poetry';
export type ReadingLevel = 'early' | 'independent' | 'advanced';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverEmoji: string;
  color: string;
  category: BookCategory;
  description: string;
  pages: number;
  isPremium: boolean;
  language: string;
  readingLevel: ReadingLevel;
}

export type InstitutionType = 'school' | 'university' | 'ngo';

export interface Institution {
  id: string;
  name: string;
  logoEmoji: string;
  color: string;
  type: InstitutionType;
  country: string;
  city: string;
  description: string;
}
