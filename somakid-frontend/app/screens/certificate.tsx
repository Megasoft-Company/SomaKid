/**
 * SOMAKID AI - Learn Screen (Duolingo-Style Learning Paths)
 * Structured learning paths with units, lessons, and progress tracking.
 * Full i18n integration with instant language switching.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { EmptyState } from '../../components/ui/EmptyState';
import { aiEngineClient } from '../../services/api/client';
import { getCurrentLanguage, onLanguageChange } from '../../i18n';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import Svg, { Path, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

interface LearningPath {
  id: string;
  slug: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  total_units: number;
  progress: number;
}

interface Unit {
  id: string;
  unit_number: number;
  name: string;
  description: string;
  total_lessons: number;
  lessons_completed: number;
  is_locked: boolean;
  is_completed: boolean;
  test_passed: boolean;
}

function PathSelector({
  paths,
  selectedPathId,
  onSelect,
}: {
  paths: LearningPath[];
  selectedPathId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pathSelectorContent}>
      {paths.map((path) => {
        const isSelected = selectedPathId === path.id;
        return (
          <TouchableOpacity
            key={path.id}
            onPress={() => onSelect(path.id)}
            activeOpacity={0.85}
            style={[styles.pathSelectorCard, Shadows.md, isSelected && { borderColor: path.color, borderWidth: 3 }]}
          >
            <LinearGradient
              colors={isSelected ? [path.color, path.color + 'DD'] : [Colors.white, Colors.gray100]}
              style={styles.pathSelectorGradient}
            >
              <View style={[styles.pathSelectorEmojiContainer, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : path.color + '15' }]}>
                <Text style={styles.pathSelectorEmoji}>{path.emoji}</Text>
              </View>
              <Text style={[styles.pathSelectorName, { color: isSelected ? Colors.white : Colors.black }]} numberOfLines={2}>
                {path.name}
              </Text>
              {path.progress > 0 && (
                <View style={[styles.pathSelectorProgressBar, { backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.08)' }]}>
                  <View style={[styles.pathSelectorProgressFill, { width: `${Math.round((path.progress / path.total_units) * 100)}%`, backgroundColor: isSelected ? Colors.white : path.color }]} />
                </View>
              )}
              {path.progress === 0 && <View style={{ height: 4 }} />}
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function UnitCard({
  unit,
  color,
  onPress,
  t,
}: {
  unit: Unit;
  color: string;
  onPress: () => void;
  t: (key: string) => string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, tension: 100, friction: 10, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, tension: 100, friction: 10, useNativeDriver: true }).start();

  const isDone = unit.is_completed && unit.test_passed;
  const isReady = unit.is_completed && !unit.test_passed;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}
        disabled={unit.is_locked} activeOpacity={0.92}
        style={[styles.unitCard, Shadows.md, unit.is_locked && styles.unitCardLocked, isDone && { borderColor: Colors.success, borderWidth: 2 }]}
      >
        <LinearGradient
          colors={unit.is_locked ? [Colors.gray200, Colors.gray300] : isDone ? [Colors.success + '18', Colors.successSurface] : isReady ? [Colors.accent + '15', Colors.white] : [Colors.white, Colors.gray100]}
          style={styles.unitCardGradient}
        >
          <View style={styles.unitCardHeader}>
            <View style={[styles.unitNumberBadge, { backgroundColor: unit.is_locked ? Colors.gray400 : isDone ? Colors.success : color }]}>
              {isDone ? (
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 6L9 17l-5-5" /></Svg>
              ) : (
                <Text style={styles.unitNumberText}>{unit.unit_number}</Text>
              )}
            </View>
            {unit.is_locked && (
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.gray400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" /><Path d="M7 11V7a5 5 0 0 1 10 0v4" /></Svg>
            )}
            {!unit.is_locked && !unit.is_completed && (
              <View style={[styles.unitPlayButton, { backgroundColor: color + '15' }]}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M5 3l14 9-14 9V3z" /></Svg>
              </View>
            )}
          </View>

          <Text style={[styles.unitCardTitle, unit.is_locked && { color: Colors.gray400 }]}>{unit.name}</Text>

          <View style={styles.unitProgressRow}>
            <View style={styles.unitProgressDots}>
              {Array.from({ length: unit.total_lessons }).map((_, i) => (
                <View key={i} style={[styles.unitProgressDot, { backgroundColor: i < unit.lessons_completed ? Colors.success : unit.is_locked ? Colors.gray300 : Colors.gray200 }]} />
              ))}
            </View>
            <Text style={[styles.unitProgressText, unit.is_locked && { color: Colors.gray400 }]}>
              {unit.lessons_completed}/{unit.total_lessons} {t('learn.lessons')}
            </Text>
          </View>

          {isReady && (
            <View style={[styles.unitTestBadge, { backgroundColor: Colors.accent + '18' }]}>
              <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={Colors.accent} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></Svg>
              <Text style={styles.unitTestBadgeText}>{t('learn.readyForTest')}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function LearnScreen() {
  const { t } = useTranslation();
  const { activeChild } = useAuth();
  const params = useLocalSearchParams<{ pathId?: string }>();

  const [selectedPathId, setSelectedPathId] = useState<string | null>(params.pathId || 'biodiversity');
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage());
  const fadeIn = useRef(new Animated.Value(0)).current;

  const loadPaths = useCallback(async () => {
    try {
      const lang = getCurrentLanguage();
      const res = await aiEngineClient.get('/learning/paths', { params: { language: lang, child_id: activeChild?.id } });
      setPaths(res.data?.data || []);
    } catch (err) { setError(t('learn.errorLoadingPaths')); }
  }, [activeChild]);

  const loadUnits = useCallback(async () => {
    if (!selectedPathId) return;
    setIsLoading(true); setError(null);
    try {
      const lang = getCurrentLanguage();
      const res = await aiEngineClient.get(`/learning/paths/${selectedPathId}/units`, { params: { language: lang, child_id: activeChild?.id } });
      setUnits(res.data?.data || []);
    } catch (err) { setError(t('learn.errorLoadingUnits')); }
    finally { setIsLoading(false); }
  }, [selectedPathId, activeChild]);

  useEffect(() => { loadPaths(); Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start(); }, []);
  useEffect(() => { loadUnits(); }, [selectedPathId]);
  useEffect(() => { const unsub = onLanguageChange((lang: string) => { setCurrentLang(lang); loadPaths(); loadUnits(); }); return unsub; }, [loadPaths, loadUnits]);

  const handlePathSelect = useCallback((pathId: string) => { setSelectedPathId(pathId); }, []);
  const handleUnitPress = useCallback((unit: Unit) => {
    if (unit.is_locked) return;
    if (unit.is_completed && !unit.test_passed) {
      router.push({ pathname: '/screens/unit-test', params: { pathId: selectedPathId, unitNumber: unit.unit_number } } as any);
    } else {
      router.push({ pathname: '/screens/unit', params: { pathId: selectedPathId, unitNumber: unit.unit_number } } as any);
    }
  }, [selectedPathId]);

  const selectedPath = paths.find((p) => p.id === selectedPathId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]} showsVerticalScrollIndicator={false} bounces={true}>
        <LinearGradient colors={[Colors.gradients.heroStart, Colors.gradients.heroMiddle]} style={styles.header}>
          <View style={styles.headerContent}>
            <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" /><Path d="M12 2v4" /><Path d="M12 18v4" /><Path d="M4.93 4.93l2.83 2.83" /><Path d="M16.24 16.24l2.83 2.83" /><Path d="M2 12h4" /><Path d="M18 12h4" />
            </Svg>
            <View><Text style={styles.headerTitle}>{t('learn.title')}</Text><Text style={styles.headerSubtitle}>{t('learn.subtitle')}</Text></View>
          </View>
        </LinearGradient>

        <View style={styles.pathSelectorSection}>
          <Text style={styles.sectionTitle}>{t('learn.choosePath')}</Text>
          <PathSelector paths={paths} selectedPathId={selectedPathId} onSelect={handlePathSelect} />
        </View>

        {selectedPath && (
          <Animated.View style={[styles.selectedPathInfo, { opacity: fadeIn }]}>
            <Text style={styles.selectedPathEmoji}>{selectedPath.emoji}</Text>
            <View style={styles.selectedPathTextContainer}>
              <Text style={styles.selectedPathName}>{selectedPath.name}</Text>
              <Text style={styles.selectedPathDescription}>{selectedPath.description}</Text>
            </View>
          </Animated.View>
        )}

        <View style={styles.unitsSection}>
          {isLoading ? (
            <View style={styles.loadingContainer}><LoadingSpinner message={t('learn.loadingUnits')} color={selectedPath?.color || Colors.primary} /></View>
          ) : error ? (
            <ErrorDisplay message={error} onRetry={loadUnits} />
          ) : units.length === 0 ? (
            <EmptyState emoji="📚" title={t('learn.noUnits')} description={t('learn.noUnitsDesc')} />
          ) : (
            <>
              <Text style={styles.sectionTitle}>{t('learn.units')}</Text>
              <View style={styles.unitPath}>
                {units.map((unit, index) => (
                  <View key={unit.id || index} style={styles.unitPathItem}>
                    <UnitCard unit={unit} color={selectedPath?.color || Colors.primary} onPress={() => handleUnitPress(unit)} t={t} />
                    {index < units.length - 1 && (
                      <View style={styles.unitConnector}>
                        <View style={[styles.unitConnectorLine, { backgroundColor: unit.is_completed ? Colors.success : Colors.gray300 }]} />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>{t('learn.tips')}</Text>
          <View style={styles.tipCard}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={Colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></Svg>
            <Text style={styles.tipText}>{t('learn.tip1')}</Text>
          </View>
          <View style={styles.tipCard}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={Colors.success} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><Path d="M22 4L12 14.01l-3-3" /></Svg>
            <Text style={styles.tipText}>{t('learn.tip2')}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scrollContent: { flexGrow: 1 },
  header: { padding: Spacing.xl, paddingTop: Spacing.lg },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerTitle: { fontSize: 26, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  headerSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)' },
  pathSelectorSection: { paddingTop: Spacing.xl, paddingHorizontal: Spacing.base },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.black, marginBottom: Spacing.md },
  pathSelectorContent: { gap: Spacing.sm, paddingRight: Spacing.base },
  pathSelectorCard: { width: 150, borderRadius: BorderRadius['2xl'], overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  pathSelectorGradient: { padding: Spacing.base, alignItems: 'center', gap: Spacing.sm, minHeight: 150 },
  pathSelectorEmojiContainer: { width: 56, height: 56, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  pathSelectorEmoji: { fontSize: 30 },
  pathSelectorName: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  pathSelectorProgressBar: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  pathSelectorProgressFill: { height: '100%', borderRadius: 2 },
  selectedPathInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.base, marginTop: Spacing.lg, padding: Spacing.base, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, ...Shadows.sm },
  selectedPathEmoji: { fontSize: 40 },
  selectedPathTextContainer: { flex: 1, gap: 4 },
  selectedPathName: { fontSize: 18, fontWeight: '800', color: Colors.black },
  selectedPathDescription: { fontSize: 14, color: Colors.gray500, lineHeight: 20 },
  unitsSection: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl },
  loadingContainer: { minHeight: 200, justifyContent: 'center', alignItems: 'center' },
  unitPath: { gap: 0 },
  unitPathItem: { gap: 0 },
  unitCard: { borderRadius: BorderRadius['2xl'], overflow: 'hidden', borderWidth: 2, borderColor: Colors.gray200, marginBottom: 0 },
  unitCardLocked: { opacity: 0.5 },
  unitCardGradient: { padding: Spacing.base, gap: Spacing.sm },
  unitCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unitNumberBadge: { width: 38, height: 38, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  unitNumberText: { fontSize: 16, fontWeight: '800', color: Colors.white },
  unitPlayButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  unitCardTitle: { fontSize: 16, fontWeight: '700', color: Colors.black },
  unitProgressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unitProgressDots: { flexDirection: 'row', gap: 6 },
  unitProgressDot: { width: 10, height: 10, borderRadius: 5 },
  unitProgressText: { fontSize: 12, fontWeight: '600', color: Colors.gray500 },
  unitTestBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: 6, alignSelf: 'flex-start' },
  unitTestBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.accent },
  unitConnector: { height: 20, alignItems: 'center', justifyContent: 'center' },
  unitConnectorLine: { width: 3, height: '100%', borderRadius: 2 },
  tipsSection: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  tipText: { flex: 1, fontSize: 14, color: Colors.gray600, lineHeight: 20 },
});