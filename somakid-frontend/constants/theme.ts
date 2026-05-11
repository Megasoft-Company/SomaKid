/**
 * SOMAKID AI - Design System Constants
 * Colors, typography, spacing, shadows for the mobile application.
 * African-inspired warm and natural color palette.
 */

// =============================================================================
// Color Palette
// =============================================================================

export const Colors = {
  // Primary - African Green
  primary: '#1B8B5E',
  primaryLight: '#2DB87A',
  primaryDark: '#0F5038',
  primarySurface: '#E8F5E9',

  // Secondary - African Sky Blue
  secondary: '#1B6CA8',
  secondaryLight: '#2A9FE8',
  secondaryDark: '#0D3B66',
  secondarySurface: '#E3F2FD',

  // Accent - Golden Sun
  accent: '#F4A228',
  accentLight: '#FFD166',
  accentDark: '#C77D20',
  accentSurface: '#FFF8E1',

  // Earth - African Soil
  earth: '#C0722A',
  earthLight: '#E8921A',
  earthSurface: '#FFF3E0',

  // Danger
  danger: '#E53E3E',
  dangerLight: '#FC8181',
  dangerSurface: '#FFF5F5',

  // Success
  success: '#38A169',
  successLight: '#68D391',
  successSurface: '#F0FFF4',

  // Neutrals
  white: '#FFFFFF',
  black: '#1A1A1A',
  gray100: '#F7FAFC',
  gray200: '#EDF2F7',
  gray300: '#E2E8F0',
  gray400: '#A0AEC0',
  gray500: '#718096',
  gray600: '#4A5568',
  gray700: '#2D3748',
  gray800: '#1A202C',
  gray900: '#171923',

  // Module-specific colors
  modules: {
    explorer: '#2D9B6E',
    academy: '#1B6CA8',
    quiz: '#E8921A',
    chat: '#8B5CF6',
  },

  // Level colors
  levels: {
    1: '#9CA3AF',
    2: '#10B981',
    3: '#3B82F6',
    4: '#8B5CF6',
    5: '#F59E0B',
  },

  // Background gradients
  gradients: {
    heroStart: '#0F5038',
    heroMiddle: '#1B8B5E',
    heroEnd: '#2DB87A',
    chatStart: '#5B21B6',
    chatEnd: '#8B5CF6',
    quizStart: '#E8921A',
    quizEnd: '#F4A228',
  },
} as const;

// =============================================================================
// Typography
// =============================================================================

export const Typography = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

// =============================================================================
// Spacing
// =============================================================================

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

// =============================================================================
// Border Radius
// =============================================================================

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,
  '3xl': 40,
  full: 9999,
} as const;

// =============================================================================
// Shadows
// =============================================================================

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  colored: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  }),
} as const;

// =============================================================================
// Animation Durations
// =============================================================================

export const Animation = {
  fast: 200,
  normal: 300,
  slow: 500,
  spring: {
    gentle: {
      tension: 50,
      friction: 8,
    },
    bouncy: {
      tension: 70,
      friction: 8,
    },
  },
} as const;

// =============================================================================
// Default Avatars
// =============================================================================

export const CHILD_AVATARS = [
  '🦁', '🐘', '🦒', '🐧', '🦜', '🐢', '🦋', '🐝', '🦊', '🐬',
] as const;

// =============================================================================
// Available Badges
// =============================================================================

export const AVAILABLE_BADGES = [
  {
    id: 'first_step',
    name: 'First Step',
    emoji: '🌱',
    color: '#38A169',
    description: 'You started your SOMAKID adventure!',
    condition: { type: 'quizCompleted', value: 1 },
  },
  {
    id: 'explorer_5',
    name: 'Explorer',
    emoji: '🔬',
    color: '#3B82F6',
    description: 'You identified 5 species!',
    condition: { type: 'speciesDiscovered', value: 5 },
  },
  {
    id: 'naturalist_10',
    name: 'Naturalist',
    emoji: '🌿',
    color: '#2D9B6E',
    description: 'You identified 10 species!',
    condition: { type: 'speciesDiscovered', value: 10 },
  },
  {
    id: 'quiz_master_10',
    name: 'Quiz Master',
    emoji: '⚡',
    color: '#F59E0B',
    description: 'You completed 10 quizzes!',
    condition: { type: 'quizCompleted', value: 10 },
  },
  {
    id: 'climate_guardian',
    name: 'Climate Guardian',
    emoji: '🌍',
    color: '#8B5CF6',
    description: 'Environmental champion!',
    condition: { type: 'totalPoints', value: 500 },
  },
  {
    id: 'mentor_50',
    name: 'Mentor',
    emoji: '💬',
    color: '#EC4899',
    description: '50 conversations with SOMA!',
    condition: { type: 'chatMessages', value: 50 },
  },
] as const;

// =============================================================================
// Supported Languages
// =============================================================================

export const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Francais', flag: '🇫🇷' },
  { code: 'ln', name: 'Lingala', flag: '🇨🇩' },
  { code: 'sw', name: 'Swahili', flag: '🌍' },
] as const;