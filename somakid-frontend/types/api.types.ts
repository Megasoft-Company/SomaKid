/**
 * SOMAKID AI - API Response Types
 * TypeScript type definitions for all API request/response contracts.
 * Clean Code architecture with strict typing.
 */

export type Language = 'fr' | 'ln' | 'sw';
export type SpeciesCategory = 'plant' | 'animal' | 'insect' | 'fungus' | 'other';
export type DangerLevel = 'none' | 'low' | 'moderate';
export type QuizSubject = 'biodiversity' | 'climate' | 'disasters' | 'behaviors';
export type ModuleType = 'explorer' | 'academy' | 'quiz' | 'chat';
export type ChildLevel = 1 | 2 | 3 | 4 | 5;
export type MessageRole = 'user' | 'assistant';

export interface ApiResponse<T> { success: boolean; data: T; message?: string; timestamp: string; }
export interface ApiErrorResponse { success: false; error_code: string; message: string; details?: Record<string, unknown>; timestamp: string; }
export interface PaginatedResponse<T> { success: boolean; data: T[]; total: number; page: number; perPage: number; }

export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest { lastName: string; firstName: string; email: string; password: string; passwordConfirmation: string; language?: Language; country?: string; }
export interface AuthResponse { user: UserProfile; token: string; }
export interface UserProfile { id: string; lastName: string; firstName: string; email: string; language: Language; country: string; role: 'parent' | 'teacher' | 'admin'; avatarUrl?: string; children: ChildProfile[]; }
export interface ChildLoginRequest { childId: string; pin: string; }
export interface CreateChildRequest { firstName: string; age: number; avatar: string; pinCode: string; language: Language; }
export interface ChildProfile { id: string; firstName: string; age: number; avatar: string; language: Language; totalPoints: number; level: ChildLevel; title: string; badges: Badge[]; speciesDiscovered: string[]; quizzesCompleted: number; lastActivity?: string; createdAt: string; }
export interface Badge { id: string; name: string; description: string; emoji: string; color: string; earnedAt?: string; }

export interface ImageAnalysisResult { species: string; localName: string | null; category: SpeciesCategory; childDescription: string; ecologicalRole: string; funFact: string; threats: string | null; childAction: string; emoji: string; dangerLevel: DangerLevel; safetyAdvice: string | null; pointsEarned: number; guardianTitle: string | null; confidence: number | null; }
export type VisionAnalyzeResponse = ApiResponse<ImageAnalysisResult>;

export interface QuizGenerateRequest { subject: QuizSubject; level: number; language: Language; sessionId?: string; }
export interface QuizQuestion { id: string; question: string; options: string[]; correctAnswer: number; explanation: string; bonusFact: string | null; points: number; subjectEmoji: string; congratulationsMessage: string; practicalTip: string | null; audioBase64?: string | null; }
export interface QuizAnswerRequest { questionId: string; chosenAnswer: number; responseTimeMs?: number; sessionId: string; childId?: string; }
export interface QuizAnswerResult { isCorrect: boolean; correctAnswer: number; explanation: string; pointsEarned: number; message: string; }
export interface QuizSubjectDefinition { id: string; name: string; emoji: string; color: string; }
export interface QuizSessionStats { sessionId: string; quizCompleted: number; correctAnswers: number; accuracy: number; totalPoints: number; }

export interface ChatMessage { id: string; role: MessageRole; content: string; timestamp: Date; pointsEarned?: number; badgeUnlocked?: string; activitySuggestion?: string; }
export interface ChatSendRequest { message: string; language: Language; sessionId: string; history?: Array<{ role: string; content: string }>; }
export interface ChatResponse { response: string; activitySuggestion: string | null; pointsEarned: number; badgeUnlocked: string | null; followUpQuestion: string | null; }
export interface ChatSessionResponse { sessionId: string; childId: string | null; }

export interface ChildProgression { sessionId: string; childId: string | null; totalPoints: number; level: ChildLevel; title: string; badges: Badge[]; speciesDiscovered: string[]; quizzesCompleted: number; totalMessages: number; lastActivity: string | null; }
export interface PointsAddedResult { sessionId: string; pointsAdded: number; totalPoints: number; currentLevel: number; leveledUp: boolean; newTitle?: string; newLevelEmoji?: string; newBadges?: Badge[]; }
export interface LevelInfo { currentLevel: number; levelTitle: string; levelEmoji: string; totalPoints: number; progressPercent: number; pointsToNextLevel: number; isMaxLevel: boolean; }

export interface TTSRequest { text: string; language: Language; speed: number; }
export interface STTRequest { audioBase64: string; language: Language; sessionId: string; }

export interface SpeciesCatalogEntry { id: string; name: string; scientificName: string | null; category: SpeciesCategory; region: string; conservationStatus: string; emoji: string; description: string; ecologicalRole: string; color: string; imageUrl?: string; }
export interface AppModule { id: ModuleType; name: string; description: string; emoji: string; color: string; levels: number | null; isActive: boolean; }