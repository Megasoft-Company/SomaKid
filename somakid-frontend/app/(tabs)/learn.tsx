/**
 * SOMAKID AI - Learn Screen (Duolingo-Style Learning Paths)
 * Structured learning paths with units, lessons, and progress tracking.
 * Full i18n integration with instant language switching.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Platform, Dimensions } from 'react-native';
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
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

interface LearningPath { id: string; slug: string; name: string; description: string; emoji: string; color: string; total_units: number; progress: number; }
interface Unit { id: string; unit_number: number; name: string; description: string; total_lessons: number; lessons_completed: number; is_locked: boolean; is_completed: boolean; test_passed: boolean; }

function PathSelector({ paths, selectedPathId, onSelect }: { paths: LearningPath[]; selectedPathId: string | null; onSelect: (id: string) => void; }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pathSelectorContent}>
      {paths.map((path) => {
        const isSelected = selectedPathId === path.id;
        return (
          <TouchableOpacity key={path.id} onPress={() => onSelect(path.id)} activeOpacity={0.9} style={[styles.pathSelectorCard, Shadows.lg, isSelected && { borderColor: path.color, borderWidth: 3 }]}>
            <LinearGradient colors={isSelected ? [path.color, path.color + 'BB'] : [Colors.white, Colors.gray100]} style={styles.pathSelectorGradient}>
              <View style={[styles.pathSelectorEmojiContainer, { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : path.color + '18' }]}>
                <Text style={styles.pathSelectorEmoji}>{path.emoji}</Text>
              </View>
              <Text style={[styles.pathSelectorName, { color: isSelected ? Colors.white : Colors.gray800, fontWeight: '800' }]} numberOfLines={2}>{path.name}</Text>
              {path.progress > 0 ? (
                <View style={[styles.pathSelectorProgressBar, { backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : Colors.gray200 }]}>
                  <View style={[styles.pathSelectorProgressFill, { width: `${Math.round((path.progress / path.total_units) * 100)}%`, backgroundColor: isSelected ? Colors.white : path.color }]} />
                </View>
              ) : <View style={{ height: 5 }} />}
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function UnitCard({ unit, color, onPress, t }: { unit: Unit; color: string; onPress: () => void; t: (key: string) => string; }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, tension: 120, friction: 10, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, tension: 120, friction: 10, useNativeDriver: true }).start();
  const isDone = unit.is_completed && unit.test_passed;
  const isReady = unit.is_completed && !unit.test_passed;
  const isActive = !unit.is_locked && !unit.is_completed;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress} disabled={unit.is_locked} activeOpacity={0.92}
        style={[styles.unitCard, Shadows.lg, unit.is_locked && { opacity: 0.45 }, isDone && { borderColor: Colors.success, borderWidth: 2.5 }, isActive && { borderColor: color + '40', borderWidth: 2 }]}>
        <LinearGradient
          colors={unit.is_locked ? [Colors.gray200, Colors.gray300] : isDone ? [Colors.success + '12', Colors.successSurface] : isReady ? [Colors.accent + '10', Colors.white] : [Colors.white, Colors.gray100]}
          style={styles.unitCardGradient}>
          <View style={styles.unitCardHeader}>
            <View style={[styles.unitNumberBadge, { backgroundColor: unit.is_locked ? Colors.gray400 : isDone ? Colors.success : isReady ? Colors.accent : color }]}>
              {isDone ? (<Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><Path d="M20 6L9 17l-5-5" /></Svg>) : (<Text style={styles.unitNumberText}>{unit.unit_number}</Text>)}
            </View>
            {unit.is_locked && (<Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.gray400} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Rect x="3" y="11" width="18" height="11" rx="2" /><Path d="M7 11V7a5 5 0 0 1 10 0v4" /></Svg>)}
            {isActive && (<View style={[styles.unitPlayButton, { backgroundColor: color + '12' }]}><Svg width={18} height={18} viewBox="0 0 24 24" fill={color} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M5 3l14 9-14 9V3z" /></Svg></View>)}
            {isReady && (<View style={[styles.unitPlayButton, { backgroundColor: Colors.accent + '12' }]}><Svg width={18} height={18} viewBox="0 0 24 24" fill={Colors.accent} stroke={Colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></Svg></View>)}
          </View>
          <Text style={[styles.unitCardTitle, unit.is_locked && { color: Colors.gray400 }]}>{unit.name}</Text>
          <Text style={[styles.unitCardDesc, unit.is_locked && { color: Colors.gray300 }]} numberOfLines={1}>{unit.description}</Text>
          <View style={styles.unitProgressRow}>
            <View style={styles.unitProgressDots}>
              {Array.from({ length: unit.total_lessons }).map((_, i) => (
                <View key={i} style={[styles.unitProgressDot, { backgroundColor: i < unit.lessons_completed ? Colors.success : Colors.gray200, width: i < unit.lessons_completed ? 14 : 10, height: i < unit.lessons_completed ? 14 : 10 }]} />
              ))}
            </View>
            <Text style={[styles.unitProgressText, unit.is_locked && { color: Colors.gray400 }]}>{unit.lessons_completed}/{unit.total_lessons} {t('learn.lessons')}</Text>
          </View>
          {isReady && (
            <View style={[styles.unitTestBadge, { backgroundColor: Colors.accent + '14' }]}>
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

  const loadPaths = useCallback(async () => { try { const lang = getCurrentLanguage(); const res = await aiEngineClient.get('/learning/paths', { params: { language: lang, child_id: activeChild?.id } }); setPaths(res.data?.data || []); } catch (err) { setError(t('learn.errorLoadingPaths')); } }, [activeChild]);
  const loadUnits = useCallback(async () => { if (!selectedPathId) return; setIsLoading(true); setError(null); try { const lang = getCurrentLanguage(); const res = await aiEngineClient.get(`/learning/paths/${selectedPathId}/units`, { params: { language: lang, child_id: activeChild?.id } }); setUnits(res.data?.data || []); } catch (err) { setError(t('learn.errorLoadingUnits')); } finally { setIsLoading(false); } }, [selectedPathId, activeChild]);

  useEffect(() => { loadPaths(); Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start(); }, []);
  useEffect(() => { loadUnits(); }, [selectedPathId]);
  useEffect(() => { const unsub = onLanguageChange((lang: string) => { setCurrentLang(lang); loadPaths(); loadUnits(); }); return unsub; }, [loadPaths, loadUnits]);

  const handlePathSelect = useCallback((pathId: string) => { setSelectedPathId(pathId); }, []);
  const handleUnitPress = useCallback((unit: Unit) => { if (unit.is_locked) return; if (unit.is_completed && !unit.test_passed) { router.push({ pathname: '/screens/unit-test', params: { pathId: selectedPathId, unitNumber: unit.unit_number } } as any); } else { router.push({ pathname: '/screens/unit', params: { pathId: selectedPathId, unitNumber: unit.unit_number } } as any); } }, [selectedPathId]);
  const selectedPath = paths.find((p) => p.id === selectedPathId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]} showsVerticalScrollIndicator={false} bounces={true}>
        <LinearGradient colors={[Colors.gradients.heroStart, Colors.gradients.heroMiddle]} style={styles.header}>
          <View style={styles.headerContent}>
            <Svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" /><Path d="M12 2v4" /><Path d="M12 18v4" /><Path d="M4.93 4.93l2.83 2.83" /><Path d="M16.24 16.24l2.83 2.83" /><Path d="M2 12h4" /><Path d="M18 12h4" /></Svg>
            <View><Text style={styles.headerTitle}>{t('learn.title')}</Text><Text style={styles.headerSubtitle}>{t('learn.subtitle')}</Text></View>
          </View>
        </LinearGradient>
        <View style={styles.pathSelectorSection}>
          <Text style={styles.sectionTitle}>{t('learn.choosePath')}</Text>
          <PathSelector paths={paths} selectedPathId={selectedPathId} onSelect={handlePathSelect} />
        </View>
        {selectedPath && (
          <Animated.View style={[styles.selectedPathInfo, { opacity: fadeIn }]}>
            <View style={[styles.selectedPathEmojiContainer, { backgroundColor: selectedPath.color + '15' }]}><Text style={styles.selectedPathEmoji}>{selectedPath.emoji}</Text></View>
            <View style={styles.selectedPathTextContainer}><Text style={styles.selectedPathName}>{selectedPath.name}</Text><Text style={styles.selectedPathDescription}>{selectedPath.description}</Text></View>
          </Animated.View>
        )}
        <View style={styles.unitsSection}>
          {isLoading ? (<View style={styles.loadingContainer}><LoadingSpinner message={t('learn.loadingUnits')} color={selectedPath?.color || Colors.primary} /></View>) : error ? (<ErrorDisplay message={error} onRetry={loadUnits} />) : units.length === 0 ? (<EmptyState emoji="📚" title={t('learn.noUnits')} description={t('learn.noUnitsDesc')} />) : (
            <><Text style={styles.sectionTitle}>{t('learn.units')}</Text>
              <View style={styles.unitPath}>
                {units.map((unit, index) => (
                  <View key={unit.id || index} style={styles.unitPathItem}>
                    <UnitCard unit={unit} color={selectedPath?.color || Colors.primary} onPress={() => handleUnitPress(unit)} t={t} />
                    {index < units.length - 1 && (<View style={styles.unitConnector}><View style={[styles.unitConnectorLine, { backgroundColor: unit.is_completed ? Colors.success : Colors.gray200 }]} /></View>)}
                  </View>))}
              </View></>)}
        </View>
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>{t('learn.tips')}</Text>
          <View style={styles.tipCard}><Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={Colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></Svg><Text style={styles.tipText}>{t('learn.tip1')}</Text></View>
          <View style={styles.tipCard}><Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={Colors.success} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><Path d="M22 4L12 14.01l-3-3" /></Svg><Text style={styles.tipText}>{t('learn.tip2')}</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scrollContent: { flexGrow: 1 },
  header: { padding: Spacing.xl, paddingTop: Spacing.lg, borderBottomLeftRadius: BorderRadius['3xl'], borderBottomRightRadius: BorderRadius['3xl'] },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerTitle: { fontSize: 28, fontWeight: '900', color: Colors.white, marginBottom: 2, letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  pathSelectorSection: { paddingTop: Spacing.xl, paddingHorizontal: Spacing.base },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.black, marginBottom: Spacing.md, letterSpacing: -0.3 },
  pathSelectorContent: { gap: Spacing.md, paddingRight: Spacing.base },
  pathSelectorCard: { width: 160, borderRadius: BorderRadius['2xl'], overflow: 'hidden', borderWidth: 3, borderColor: 'transparent' },
  pathSelectorGradient: { padding: Spacing.md, alignItems: 'center', gap: Spacing.sm, minHeight: 165 },
  pathSelectorEmojiContainer: { width: 60, height: 60, borderRadius: BorderRadius['2xl'], alignItems: 'center', justifyContent: 'center' },
  pathSelectorEmoji: { fontSize: 32 },
  pathSelectorName: { fontSize: 15, fontWeight: '800', textAlign: 'center', lineHeight: 20 },
  pathSelectorProgressBar: { width: '100%', height: 5, borderRadius: 3, overflow: 'hidden' },
  pathSelectorProgressFill: { height: '100%', borderRadius: 3 },
  selectedPathInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginHorizontal: Spacing.base, marginTop: Spacing.lg, padding: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius['2xl'], ...Shadows.md },
  selectedPathEmojiContainer: { width: 56, height: 56, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  selectedPathEmoji: { fontSize: 32 },
  selectedPathTextContainer: { flex: 1, gap: 3 },
  selectedPathName: { fontSize: 18, fontWeight: '800', color: Colors.black },
  selectedPathDescription: { fontSize: 13, color: Colors.gray500, lineHeight: 18 },
  unitsSection: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl },
  loadingContainer: { minHeight: 220, justifyContent: 'center', alignItems: 'center' },
  unitPath: { gap: 0 },
  unitPathItem: { gap: 0 },
  unitCard: { borderRadius: BorderRadius['2xl'], overflow: 'hidden', marginBottom: 0 },
  unitCardGradient: { padding: Spacing.md, gap: Spacing.sm },
  unitCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unitNumberBadge: { width: 42, height: 42, borderRadius: BorderRadius.xl, alignItems: 'center', justifyContent: 'center' },
  unitNumberText: { fontSize: 18, fontWeight: '900', color: Colors.white },
  unitPlayButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  unitCardTitle: { fontSize: 17, fontWeight: '800', color: Colors.black, letterSpacing: -0.2 },
  unitCardDesc: { fontSize: 13, color: Colors.gray500, lineHeight: 18 },
  unitProgressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  unitProgressDots: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  unitProgressDot: { borderRadius: 7 },
  unitProgressText: { fontSize: 13, fontWeight: '700', color: Colors.gray500 },
  unitTestBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.sm, paddingVertical: 8, alignSelf: 'flex-start' },
  unitTestBadgeText: { fontSize: 13, fontWeight: '700', color: Colors.accent },
  unitConnector: { height: 18, alignItems: 'center', justifyContent: 'center' },
  unitConnectorLine: { width: 3, height: '100%', borderRadius: 2 },
  tipsSection: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl, paddingBottom: Spacing.xl },
  tipCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  tipText: { flex: 1, fontSize: 14, color: Colors.gray600, lineHeight: 20 },
});