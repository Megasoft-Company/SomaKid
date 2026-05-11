/**
 * SOMAKID AI - Progression Hook
 * React hook for tracking child learning progress and achievements.
 */

import { useState, useCallback, useMemo } from 'react';
import { ProgressionService } from '../services/api/progression.service';
import type { ChildProgression, PointsAddedResult, LevelInfo, Badge } from '../types/api.types';
import { extractErrorMessage } from '../services/api/client';
import { LEVEL_TITLES, LEVEL_EMOJIS } from '../types/domain.types';

export function useProgression(sessionId: string, childId?: string) {
  const [progression, setProgression] = useState<ChildProgression | null>(null);
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const levelProgress = useMemo(() => {
    return levelInfo?.progressPercent ?? 0;
  }, [levelInfo]);

  const levelEmoji = useMemo(() => {
    if (!progression) return '🌱';
    return LEVEL_EMOJIS[progression.level] ?? '🌱';
  }, [progression]);

  const levelTitle = useMemo(() => {
    if (!progression) return 'Junior Explorer';
    return LEVEL_TITLES[progression.level] ?? 'Junior Explorer';
  }, [progression]);

  const loadProgression = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ProgressionService.getProgression(sessionId, childId);
      setProgression(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, childId]);

  const loadLevelInfo = useCallback(async () => {
    try {
      const data = await ProgressionService.getLevelInfo(sessionId);
      setLevelInfo(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [sessionId]);

  const addPoints = useCallback(
    async (points: number, source: string = 'activity'): Promise<PointsAddedResult | null> => {
      try {
        const result = await ProgressionService.addPoints(sessionId, points, source);
        await loadProgression();
        await loadLevelInfo();
        return result;
      } catch (err) {
        setError(extractErrorMessage(err));
        return null;
      }
    },
    [sessionId, loadProgression, loadLevelInfo]
  );

  const loadBadges = useCallback(async () => {
    try {
      const data = await ProgressionService.getEarnedBadges(sessionId);
      setBadges(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [sessionId]);

  const loadAllBadges = useCallback(async () => {
    try {
      const data = await ProgressionService.getAvailableBadges();
      setAllBadges(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, []);

  const recordDiscovery = useCallback(
    async (speciesName: string) => {
      try {
        const result = await ProgressionService.recordDiscovery(sessionId, speciesName);
        await loadProgression();
        return result;
      } catch (err) {
        setError(extractErrorMessage(err));
        return null;
      }
    },
    [sessionId, loadProgression]
  );

  return {
    progression,
    levelInfo,
    badges,
    allBadges,
    isLoading,
    error,
    levelProgress,
    levelEmoji,
    levelTitle,
    loadProgression,
    loadLevelInfo,
    addPoints,
    loadBadges,
    loadAllBadges,
    recordDiscovery,
    clearError: () => setError(null),
  };
}