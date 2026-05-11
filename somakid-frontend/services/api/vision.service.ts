/**
 * SOMAKID AI - Vision Analysis Service
 * Handles image upload and species identification via the AI Engine.
 */

import { aiEngineClient } from './client';
import type {
  ApiResponse,
  ImageAnalysisResult,
  SpeciesCatalogEntry,
  Language,
} from '../../types/api.types';

// =============================================================================
// API Response Type (snake_case from Python backend)
// =============================================================================

interface VisionAnalyzeApiResponse {
  espece: string;
  nom_local: string | null;
  categorie: string;
  description_enfant: string;
  role_ecologique: string;
  fait_amusant: string;
  menaces: string | null;
  action_enfant: string;
  emoji: string;
  niveau_danger: string;
  conseils_securite: string | null;
  points_gagnes: number;
  titre_gardien: string | null;
  confiance: number | null;
}

// =============================================================================
// Vision Service
// =============================================================================

export const VisionService = {
  /**
   * Analyze a nature image for species identification.
   */
  async analyzeImage(
    imageUri: string,
    language: Language = 'fr',
    childAge: number = 8,
    sessionId?: string,
    childId?: string
  ): Promise<ImageAnalysisResult> {
    const formData = new FormData();

    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'capture.jpg',
    } as unknown as Blob);

    formData.append('language', language);
    formData.append('child_age', String(childAge));

    if (sessionId) formData.append('session_id', sessionId);
    if (childId) formData.append('child_id', childId);

    const response = await aiEngineClient.post<ApiResponse<VisionAnalyzeApiResponse>>(
      '/vision/analyze',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      }
    );

    const data = response.data.data;

    // Map snake_case API response to camelCase TypeScript interface
    return {
      species: data.espece,
      localName: data.nom_local,
      category: data.categorie as ImageAnalysisResult['category'],
      childDescription: data.description_enfant,
      ecologicalRole: data.role_ecologique,
      funFact: data.fait_amusant,
      threats: data.menaces,
      childAction: data.action_enfant,
      emoji: data.emoji,
      dangerLevel: (data.niveau_danger || 'none') as ImageAnalysisResult['dangerLevel'],
      safetyAdvice: data.conseils_securite,
      pointsEarned: data.points_gagnes,
      guardianTitle: data.titre_gardien,
      confidence: data.confiance,
    };
  },

  /**
   * Analyze a base64-encoded image.
   */
  async analyzeBase64Image(
    base64Data: string,
    language: Language = 'fr',
    childAge: number = 8,
    sessionId?: string,
    childId?: string
  ): Promise<ImageAnalysisResult> {
    const formData = new FormData();
    formData.append('image_base64', base64Data);
    formData.append('language', language);
    formData.append('child_age', String(childAge));

    if (sessionId) formData.append('session_id', sessionId);
    if (childId) formData.append('child_id', childId);

    const response = await aiEngineClient.post<ApiResponse<VisionAnalyzeApiResponse>>(
      '/vision/analyze-base64',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      }
    );

    const data = response.data.data;

    return {
      species: data.espece,
      localName: data.nom_local,
      category: data.categorie as ImageAnalysisResult['category'],
      childDescription: data.description_enfant,
      ecologicalRole: data.role_ecologique,
      funFact: data.fait_amusant,
      threats: data.menaces,
      childAction: data.action_enfant,
      emoji: data.emoji,
      dangerLevel: (data.niveau_danger || 'none') as ImageAnalysisResult['dangerLevel'],
      safetyAdvice: data.conseils_securite,
      pointsEarned: data.points_gagnes,
      guardianTitle: data.titre_gardien,
      confidence: data.confiance,
    };
  },

  /**
   * Get the species catalog.
   */
  async getCatalog(category?: string, language: Language = 'fr'): Promise<SpeciesCatalogEntry[]> {
    const params: Record<string, string> = { language };
    if (category) params.category = category;

    const response = await aiEngineClient.get<ApiResponse<SpeciesCatalogEntry[]>>(
      '/vision/catalog',
      { params }
    );
    return response.data.data;
  },

  /**
   * Get detailed information about a specific species.
   */
  async getSpeciesDetail(speciesId: string, language: Language = 'fr'): Promise<SpeciesCatalogEntry> {
    const response = await aiEngineClient.get<ApiResponse<SpeciesCatalogEntry>>(
      `/vision/species/${speciesId}`,
      { params: { language } }
    );
    return response.data.data;
  },
};