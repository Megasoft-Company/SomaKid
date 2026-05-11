/**
 * SOMAKID AI - Progression Service
 * Handles child learning progress tracking, points, levels, and badges.
 */

import { aiEngineClient } from './client';
import {
  ApiResponse,
  ChildProgression,
  PointsAddedResult,
  LevelInfo,
  Badge,
} from '../../types/api.types';

// =============================================================================
// Progression Service
// =============================================================================

export const ProgressionService = {
  /**
   * Get complete progression data for a child session.
   */
  async getProgression(sessionId: string, childId?: string): Promise<ChildProgression> {
    const params: Record<string, string> = {};
    if (childId) {
      params.child_id = childId;
    }

    const response = await aiEngineClient.get<ApiResponse<ChildProgression>>(
      `/progression/${sessionId}`,
      { params }
    );

    return response.data.data;
  },

  /**
   * Add points to a child's progression.
   */
  async addPoints(
    sessionId: string,
    points: number,
    source: string = 'activity'
  ): Promise<PointsAddedResult> {
    const response = await aiEngineClient.post<ApiResponse<PointsAddedResult>>(
      '/progression/points/add',
      {
        identifiant_session: sessionId,
        module: source,
        score: points,
      }
    );

    return response.data.data;
  },

  /**
   * Get detailed level information for a session.
   */
  async getLevelInfo(sessionId: string): Promise<LevelInfo> {
    const response = await aiEngineClient.get<ApiResponse<LevelInfo>>(
      `/progression/${sessionId}/level`
    );

    return response.data.data;
  },

  /**
   * Get badges earned by a child.
   */
  async getEarnedBadges(sessionId: string): Promise<Badge[]> {
    const response = await aiEngineClient.get<ApiResponse<Badge[]>>(
      `/progression/${sessionId}/badges`
    );

    return response.data.data;
  },

  /**
   * Get all available badges that can be earned.
   */
  async getAvailableBadges(): Promise<Badge[]> {
    const response = await aiEngineClient.get<ApiResponse<Badge[]>>(
      '/progression/badges/available'
    );

    return response.data.data;
  },

  /**
   * Record a new species discovery.
   */
  async recordDiscovery(
    sessionId: string,
    speciesName: string,
    pointsEarned: number = 10
  ): Promise<{
    species: string;
    isNewDiscovery: boolean;
    totalSpeciesDiscovered: number;
    pointsEarned: number;
  }> {
    const response = await aiEngineClient.post('/progression/discovery', {
      identifiant_session: sessionId,
      species_name: speciesName,
      points_earned: pointsEarned,
    });

    return response.data.data;
  },
};