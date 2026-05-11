/**
 * SOMAKID AI - Species Detail Screen
 * Detailed view of a species from the catalog or discovery.
 * Full i18n integration with instant language switching.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { VisionService } from '../../services/api/vision.service';
import { useTranslation } from '../../hooks/useTranslation';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import type { SpeciesCatalogEntry } from '../../types/api.types';
import Svg, { Path } from 'react-native-svg';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

export default function SpeciesDetailScreen() {
  const { t } = useTranslation();
  const { speciesId } = useLocalSearchParams<{ speciesId: string }>();
  const [species, setSpecies] = useState<SpeciesCatalogEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSpecies();
  }, [speciesId]);

  const loadSpecies = async () => {
    if (!speciesId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await VisionService.getSpeciesDetail(speciesId);
      setSpecies(data);
    } catch (err) {
      setError(t('explorer.analysisError'));
    } finally {
      setIsLoading(false);
    }
  };

  const getConservationStatusColor = (status: string) => {
    const lowerStatus = status?.toLowerCase() || '';
    if (lowerStatus.includes('endangered') || lowerStatus.includes('critically')) {
      return Colors.danger;
    }
    if (lowerStatus.includes('vulnerable') || lowerStatus.includes('threatened')) {
      return Colors.accent;
    }
    if (lowerStatus.includes('least concern') || lowerStatus.includes('common')) {
      return Colors.success;
    }
    return Colors.gray500;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        contentContainerStyle={[styles.scroll, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={[Colors.gradients.heroStart, Colors.gradients.heroMiddle]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <View style={styles.backButtonInner}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M19 12H5M12 19l-7-7 7-7" />
              </Svg>
            </View>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* ── Loading ── */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <LoadingSpinner message={t('common.loading')} color={Colors.primary} />
          </View>
        )}

        {/* ── Error ── */}
        {error && (
          <View style={styles.errorContainer}>
            <ErrorDisplay message={error} onRetry={loadSpecies} />
          </View>
        )}

        {/* ── Not Found ── */}
        {!isLoading && !error && !species && (
          <View style={styles.emptyContainer}>
            <EmptyState 
              emoji="🔍" 
              title={t('explorer.unknownSpecies')} 
              description={t('common.noData')} 
            />
          </View>
        )}

        {/* ── Species Content ── */}
        {species && (
          <View style={styles.content}>
            {/* Hero Section */}
            <View style={styles.heroSection}>
              <View style={styles.heroEmojiContainer}>
                <Text style={styles.heroEmoji}>{species.emoji}</Text>
              </View>
              <Text style={styles.heroName}>{species.name}</Text>
              {species.scientificName && (
                <Text style={styles.scientificName}>{species.scientificName}</Text>
              )}
              {species.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{species.category}</Text>
                </View>
              )}
            </View>

            {/* Detail Card */}
            <View style={styles.detailCard}>
              <InfoRow 
                label={t('explorer.about')} 
                value={species.category || 'N/A'} 
                icon={
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
                    <Path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                  </Svg>
                }
              />
              <InfoRow 
                label={t('explorer.roleInNature')} 
                value={species.region || 'N/A'} 
                icon={
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.secondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
                    <Path d="M2 12h20" />
                    <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </Svg>
                }
              />
              <InfoRow 
                label={t('explorer.threats')} 
                value={species.conservationStatus || 'N/A'} 
                valueColor={getConservationStatusColor(species.conservationStatus || '')}
                icon={
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </Svg>
                }
                isLast
              />
            </View>

            {/* Description */}
            {species.description && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <Path d="M14 2v6h6" />
                    <Path d="M16 13H8" />
                    <Path d="M16 17H8" />
                    <Path d="M10 9H8" />
                  </Svg>
                  <Text style={styles.sectionTitle}>{t('explorer.about')}</Text>
                </View>
                <Text style={styles.sectionText}>{species.description}</Text>
              </View>
            )}

            {/* Ecological Role */}
            {species.ecologicalRole && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.secondary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
                    <Path d="M12 2v4" />
                    <Path d="M12 18v4" />
                    <Path d="M4.93 4.93l2.83 2.83" />
                    <Path d="M16.24 16.24l2.83 2.83" />
                    <Path d="M2 12h4" />
                    <Path d="M18 12h4" />
                    <Path d="M4.93 19.07l2.83-2.83" />
                    <Path d="M16.24 7.76l2.83-2.83" />
                  </Svg>
                  <Text style={[styles.sectionTitle, { color: Colors.secondary }]}>{t('explorer.roleInNature')}</Text>
                </View>
                <Text style={styles.sectionText}>{species.ecologicalRole}</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ 
  label, 
  value, 
  icon,
  valueColor,
  isLast,
}: { 
  label: string; 
  value: string; 
  icon?: React.ReactNode;
  valueColor?: string;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.infoRow, isLast && styles.infoRowLast]}>
      <View style={styles.infoRowLeft}>
        {icon && <View style={styles.infoRowIcon}>{icon}</View>}
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scroll: { flexGrow: 1 },

  // ── Header ──
  header: { 
    padding: Spacing.xl, 
    paddingTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: Typography.sizes.base,
    color: '#fff',
    fontWeight: Typography.weights.semibold,
  },

  // ── Loading / Error / Empty ──
  loadingContainer: {
    flex: 1,
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorContainer: {
    margin: Spacing.base,
  },
  emptyContainer: {
    flex: 1,
    minHeight: 300,
    justifyContent: 'center',
    padding: Spacing.xl,
  },

  // ── Content ──
  content: { 
    padding: Spacing.base,
    marginTop: -Spacing.xl,
  },

  // ── Hero Section ──
  heroSection: { 
    alignItems: 'center', 
    backgroundColor: Colors.white, 
    borderRadius: BorderRadius['2xl'], 
    padding: Spacing['2xl'], 
    marginBottom: Spacing.base, 
    ...Shadows.md 
  },
  heroEmojiContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroEmoji: { fontSize: 56 },
  heroName: { 
    fontSize: Typography.sizes['2xl'], 
    fontWeight: Typography.weights.extrabold, 
    color: Colors.black, 
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  scientificName: { 
    fontSize: Typography.sizes.md, 
    color: Colors.gray500, 
    fontStyle: 'italic', 
    marginBottom: Spacing.md,
  },
  categoryBadge: {
    backgroundColor: Colors.primarySurface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  categoryBadgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.primary,
  },

  // ── Detail Card ──
  detailCard: { 
    backgroundColor: Colors.white, 
    borderRadius: BorderRadius.xl, 
    padding: Spacing.lg, 
    marginBottom: Spacing.base, 
    ...Shadows.sm 
  },
  infoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: Spacing.sm, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.gray100,
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoRowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { 
    fontSize: Typography.sizes.sm, 
    color: Colors.gray500,
    fontWeight: Typography.weights.medium,
  },
  infoValue: { 
    fontSize: Typography.sizes.md, 
    fontWeight: Typography.weights.semibold, 
    color: Colors.black,
    maxWidth: '50%',
    textAlign: 'right',
  },

  // ── Sections ──
  section: { 
    backgroundColor: Colors.white, 
    borderRadius: BorderRadius.xl, 
    padding: Spacing.lg, 
    marginBottom: Spacing.base, 
    ...Shadows.sm 
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: { 
    fontSize: Typography.sizes.base, 
    fontWeight: Typography.weights.bold, 
    color: Colors.primary, 
    textTransform: 'uppercase', 
    letterSpacing: 0.5,
  },
  sectionText: { 
    fontSize: Typography.sizes.md, 
    color: Colors.gray600, 
    lineHeight: 24,
  },
});