/**
 * SOMAKID AI - Vision Analysis Hook
 * React hook for species identification from camera or gallery images.
 * Now with audio support via /chat/tts.
 */

import { useState, useCallback } from 'react';
import type { ImageAnalysisResult, Language, SpeciesCatalogEntry } from '../types/api.types';
import { aiEngineClient } from '../services/api/client';
import { extractErrorMessage } from '../services/api/client';

interface UseVisionReturn {
  result: ImageAnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  catalog: SpeciesCatalogEntry[];
  isCatalogLoading: boolean;
  analyzeImage: (imageUri: string, language?: Language, childAge?: number) => Promise<void>;
  analyzeBase64: (base64Data: string, language?: Language, childAge?: number) => Promise<void>;
  loadCatalog: (category?: string, language?: Language) => Promise<void>;
  clearResult: () => void;
  clearError: () => void;
}

export function useVision(): UseVisionReturn {
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<SpeciesCatalogEntry[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  const analyzeImage = useCallback(async (imageUri: string, language: Language = 'fr', childAge: number = 8) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image', { uri: imageUri, type: 'image/jpeg', name: 'photo.jpg' } as any);
      formData.append('language', language);
      formData.append('child_age', String(childAge));

      const res = await aiEngineClient.post('/vision/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      const data = res.data?.data;
      
      const mappedResult: ImageAnalysisResult = {
        species: data?.species || data?.espece || 'Unknown',
        localName: data?.localName || data?.nom_local || null,
        category: data?.category || data?.categorie || 'other',
        childDescription: data?.childDescription || data?.description_enfant || '',
        ecologicalRole: data?.ecologicalRole || data?.role_ecologique || '',
        funFact: data?.funFact || data?.fait_amusant || '',
        threats: data?.threats || data?.menaces || null,
        childAction: data?.childAction || data?.action_enfant || '',
        emoji: data?.emoji || '🌿',
        dangerLevel: data?.dangerLevel || data?.niveau_danger || 'none',
        safetyAdvice: data?.safetyAdvice || data?.conseils_securite || null,
        pointsEarned: data?.pointsEarned || data?.points_gagnes || 10,
        guardianTitle: data?.guardianTitle || data?.titre_gardien || null,
        confidence: data?.confidence || data?.confiance || null,
      };

      setResult(mappedResult);
    } catch (err) {
      setError(extractErrorMessage(err));
      setResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyzeBase64 = useCallback(async (base64Data: string, language: Language = 'fr', childAge: number = 8) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('image_base64', base64Data);
      formData.append('language', language);
      formData.append('child_age', String(childAge));

      const res = await aiEngineClient.post('/vision/analyze-base64', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      const data = res.data?.data;
      
      const mappedResult: ImageAnalysisResult = {
        species: data?.species || data?.espece || 'Unknown',
        localName: data?.localName || data?.nom_local || null,
        category: data?.category || data?.categorie || 'other',
        childDescription: data?.childDescription || data?.description_enfant || '',
        ecologicalRole: data?.ecologicalRole || data?.role_ecologique || '',
        funFact: data?.funFact || data?.fait_amusant || '',
        threats: data?.threats || data?.menaces || null,
        childAction: data?.childAction || data?.action_enfant || '',
        emoji: data?.emoji || '🌿',
        dangerLevel: data?.dangerLevel || data?.niveau_danger || 'none',
        safetyAdvice: data?.safetyAdvice || data?.conseils_securite || null,
        pointsEarned: data?.pointsEarned || data?.points_gagnes || 10,
        guardianTitle: data?.guardianTitle || data?.titre_gardien || null,
        confidence: data?.confidence || data?.confiance || null,
      };

      setResult(mappedResult);
    } catch (err) {
      setError(extractErrorMessage(err));
      setResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const loadCatalog = useCallback(async (category?: string, language: Language = 'fr') => {
    setIsCatalogLoading(true);
    try {
      const params: Record<string, string> = { language };
      if (category) params.category = category;
      const res = await aiEngineClient.get('/vision/catalog', { params });
      setCatalog(res.data?.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => setResult(null), []);
  const clearError = useCallback(() => setError(null), []);

  return { result, isAnalyzing, error, catalog, isCatalogLoading, analyzeImage, analyzeBase64, loadCatalog, clearResult, clearError };
}