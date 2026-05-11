import { aiEngineClient } from './client';
import type {
  ApiResponse,
  QuizQuestion,
  QuizGenerateRequest,
  QuizAnswerResult,
  QuizSubjectDefinition,
  QuizSessionStats,
  Language,
} from '../../types/api.types';

export const QuizService = {
  async generateQuestion(request: QuizGenerateRequest): Promise<QuizQuestion> {
    const response = await aiEngineClient.post<ApiResponse<any>>('/quiz/generate', {
      sujet: request.subject,
      niveau: request.level,
      langue: request.language,
      // identifiant_session is the key the backend uses to load+save the
      // per-session dedup window. Always send it when available.
      identifiant_session: request.sessionId ?? null,
    });
    const data = response.data.data;
    return {
      id: data.identifiant || data.id || `q_${Date.now()}`,
      question: data.question || '',
      options: data.options || [],
      correctAnswer: data.reponse_correcte ?? data.correctAnswer ?? 0,
      explanation: data.explication || data.explanation || '',
      bonusFact: data.fait_bonus || data.bonusFact || null,
      points: data.points || 10,
      subjectEmoji: data.emoji_sujet || data.subjectEmoji || '🌿',
      congratulationsMessage: data.message_felicitations || data.congratulationsMessage || 'Bien joue !',
      practicalTip: data.conseil_pratique || data.practicalTip || null,
      audioBase64: data.audio_base64 || null,
    };
  },

  async submitVoiceAnswer(
    audioBase64: string,
    language: Language = 'fr',
    subject: string = 'biodiversity',
    level: number = 1,
    sessionId?: string,
  ): Promise<{ transcription: string; audioBase64: string }> {
    const response = await aiEngineClient.post<ApiResponse<any>>('/quiz/voice-quiz', {
      audio_base64: audioBase64,
      langue: language,
      subject,
      level,
      session_id: sessionId ?? null,
    });
    return {
      transcription: response.data.data?.transcription || '',
      audioBase64: response.data.data?.audio_base64 || '',
    };
  },

  async getSubjects(language: Language = 'fr'): Promise<QuizSubjectDefinition[]> {
    const response = await aiEngineClient.get<ApiResponse<QuizSubjectDefinition[]>>(
      '/quiz/subjects',
      { params: { language } },
    );
    return response.data.data;
  },

  async getSessionStats(sessionId: string): Promise<QuizSessionStats> {
    const response = await aiEngineClient.get<ApiResponse<QuizSessionStats>>(
      `/quiz/session/${sessionId}`,
    );
    return response.data.data;
  },
};