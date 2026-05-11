/**
 * SOMAKID AI - Chat Service
 * Handles interactive conversations with the SOMA AI tutor and image analysis.
 */

import { aiEngineClient } from './client';
import type {
  ApiResponse,
  ChatSendRequest,
  ChatResponse,
  ChatSessionResponse,
  Language,
} from '../../types/api.types';

interface ChatMessageApiResponse {
  reponse?: string;
  response?: string;
  suggestion_activite?: string | null;
  points_gagnes?: number;
  badge_debloque?: string | null;
  question_suivi?: string | null;
}

interface VisionApiResponse {
  espece?: string;
  nom_local?: string | null;
  categorie?: string;
  description_enfant?: string;
  role_ecologique?: string;
  fait_amusant?: string;
  action_enfant?: string;
  emoji?: string;
  niveau_danger?: string;
  conseils_securite?: string | null;
  points_gagnes?: number;
  titre_gardien?: string;
  menaces?: string | null;
  confiance?: number;
  reponse?: string;
  response?: string;
  question_suivi?: string | null;
}

interface SessionHistoryApiResponse {
  session_id: string;
  messages: Array<{ role: string; content: string }>;
  total_messages: number;
}

interface SessionCreateApiResponse {
  session_id: string;
  child_id: string | null;
}

export const ChatService = {

  async sendMessage(request: ChatSendRequest): Promise<{ response: ChatResponse; historyLength: number }> {
    const response = await aiEngineClient.post<ApiResponse<ChatMessageApiResponse> & { history_length: number }>(
      '/chat/message',
      { message: request.message, langue: request.language, identifiant_session: request.sessionId, historique: request.history || [] },
    );
    const data = response.data.data;
    const mainResponse = data.reponse || data.response || '';
    return {
      response: { response: mainResponse, activitySuggestion: data.suggestion_activite || null, pointsEarned: data.points_gagnes || 0, badgeUnlocked: data.badge_debloque || null, followUpQuestion: data.question_suivi || null },
      historyLength: response.data.history_length || 0,
    };
  },

  async analyzeImage(imageUri: string, language: Language = 'fr', childAge: number = 8): Promise<ChatResponse> {
    if (!imageUri || imageUri.trim().length < 5) throw new Error(`Invalid image URI: "${imageUri}"`);

    const formData = new FormData();
    formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'photo.jpg' } as any);
    formData.append('language', language);
    formData.append('child_age', String(childAge));

    const response = await aiEngineClient.post('/vision/analyze', formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30000 });
    const data: VisionApiResponse | null = response.data?.data ?? null;
    if (!data) throw new Error('Empty response from vision server.');

    const directResponse = (data.reponse || data.response || '').trim();
    let mainResponse = directResponse;

    if (!mainResponse) {
      const parts: string[] = [];
      if (data.espece) {
        const nomLocal = data.nom_local ? ` (${data.nom_local})` : '';
        parts.push(`${data.emoji ? data.emoji + ' ' : ''}${data.espece}${nomLocal}`);
      }
      if (data.description_enfant) parts.push(data.description_enfant);
      if (data.role_ecologique) parts.push(`Role dans la nature : ${data.role_ecologique}`);
      if (data.fait_amusant) parts.push(`Le savais-tu ? ${data.fait_amusant}`);
      if (data.action_enfant) parts.push(`Ce que tu peux faire : ${data.action_enfant}`);
      if (data.conseils_securite && data.niveau_danger && data.niveau_danger !== 'none') parts.push(`Attention : ${data.conseils_securite}`);
      mainResponse = parts.join('\n\n');
    }

    if (!mainResponse) throw new Error('Could not assemble response from vision data.');

    return { response: mainResponse, activitySuggestion: null, pointsEarned: data.points_gagnes ?? 5, badgeUnlocked: data.titre_gardien ?? null, followUpQuestion: data.question_suivi ?? null };
  },

  async createSession(childId?: string): Promise<ChatSessionResponse> {
    const params: Record<string, string> = {};
    if (childId) params.child_id = childId;
    const response = await aiEngineClient.post<ApiResponse<SessionCreateApiResponse>>('/chat/session/create', null, { params });
    const data = response.data.data;
    return { sessionId: data.session_id, childId: data.child_id };
  },

  async getSessionHistory(sessionId: string, limit: number = 50): Promise<{ sessionId: string; messages: Array<{ role: string; content: string }>; totalMessages: number }> {
    const response = await aiEngineClient.get<ApiResponse<SessionHistoryApiResponse>>(`/chat/session/${sessionId}`, { params: { limit } });
    const data = response.data.data;
    return { sessionId: data.session_id, messages: data.messages, totalMessages: data.total_messages };
  },

  async getQuickQuestions(language: Language = 'fr'): Promise<string[]> {
    const response = await aiEngineClient.get<ApiResponse<string[]>>('/chat/quick-questions', { params: { language } });
    return response.data.data;
  },

  generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  },
};