/**
 * SOMAKID AI - Domain Entity Types
 * Core business domain types following DDD principles.
 * Clean Code architecture with immutable value objects.
 */

import type { Language, SpeciesCategory, DangerLevel, ChildLevel, Badge } from './api.types';

// =============================================================================
// Value Objects
// =============================================================================

/** Immutable value object for child age */
export class ChildAge {
  private constructor(public readonly value: number) {}

  static create(age: number): ChildAge {
    if (age < 3 || age > 15) {
      throw new Error(`Child age must be between 3 and 15, got: ${age}`);
    }
    return new ChildAge(age);
  }

  isYoungChild(): boolean {
    return this.value < 7;
  }

  getAgeGroup(): 'veryYoung' | 'young' | 'middle' | 'teenager' {
    if (this.value <= 5) return 'veryYoung';
    if (this.value <= 8) return 'young';
    if (this.value <= 12) return 'middle';
    return 'teenager';
  }
}

/** Immutable value object for points */
export class Points {
  private constructor(public readonly amount: number) {}

  static zero(): Points {
    return new Points(0);
  }

  static from(amount: number): Points {
    if (amount < 0) throw new Error('Points cannot be negative');
    return new Points(amount);
  }

  add(quantity: number): Points {
    if (quantity < 0) throw new Error('Cannot add negative points');
    return new Points(this.amount + quantity);
  }

  calculateLevel(): ChildLevel {
    if (this.amount >= 500) return 5;
    if (this.amount >= 300) return 4;
    if (this.amount >= 150) return 3;
    if (this.amount >= 50) return 2;
    return 1;
  }

  getLevelProgress(): number {
    const thresholds: Record<number, number> = {
      1: 0, 2: 50, 3: 150, 4: 300, 5: 500,
    };
    const currentLevel = this.calculateLevel();
    if (currentLevel >= 5) return 100;

    const currentThreshold = thresholds[currentLevel];
    const nextThreshold = thresholds[currentLevel + 1];
    const progress = ((this.amount - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  }
}

// =============================================================================
// Domain Entities
// =============================================================================

/** Species entity */
export interface Species {
  id: string;
  commonName: string;
  scientificName: string | null;
  localName: string | null;
  category: SpeciesCategory;
  description: string;
  ecologicalRole: string;
  funFact: string;
  threats: string | null;
  dangerLevel: DangerLevel;
  safetyAdvice: string | null;
  originRegion: string;
  conservationStatus: string;
  primaryEmoji: string;
}

/** Discovery entity */
export interface Discovery {
  id: string;
  childId: string | null;
  species: Species;
  imagePath: string | null;
  discoveryDate: Date;
  pointsEarned: number;
}

/** Quiz question entity */
export interface QuizQuestionEntity {
  id: string;
  subject: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  bonusFact: string | null;
  points: number;
  difficultyLevel: number;
  language: Language;
  subjectEmoji: string;
  practicalTip: string | null;
}

/** Chat message entity */
export interface ChatMessageEntity {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  language: Language;
  pointsEarned: number;
  activitySuggestion: string | null;
  badgeUnlocked: string | null;
  timestamp: Date;
}

/** Achievement badge entity */
export interface AchievementBadge {
  badgeId: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  conditionType: string;
  conditionValue: number;
  earnedAt: Date | null;
}

/** Child progress aggregate */
export interface ChildProgressAggregate {
  childId: string | null;
  sessionId: string;
  firstName: string;
  age: ChildAge;
  points: Points;
  level: ChildLevel;
  title: string;
  earnedBadges: AchievementBadge[];
  discoveredSpecies: string[];
  quizzesCompleted: number;
  correctAnswers: number;
  totalMessages: number;
  totalTimeSeconds: number;
  lastActivity: Date | null;
  createdAt: Date;
}

// =============================================================================
// Level Configuration Constants
// =============================================================================

/** Level title mapping */
export const LEVEL_TITLES: Record<number, string> = {
  1: 'Junior Explorer',
  2: 'Ecology Apprentice',
  3: 'Confirmed Explorer',
  4: 'Naturalist Expert',
  5: 'Climate Guardian',
};

/** Level emoji mapping */
export const LEVEL_EMOJIS: Record<number, string> = {
  1: '🌱',
  2: '🌿',
  3: '🌳',
  4: '🦁',
  5: '🌍',
};

/** Level point thresholds */
export const LEVEL_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 50,
  3: 150,
  4: 300,
  5: 500,
};
