/**
 * SOMAKID AI - Profile Screen
 * Displays child progress, badges, discovered species, and settings.
 * Full i18n integration with instant language switching.
 */

import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { useProgression } from '../../hooks/useProgression';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { BadgeDisplay } from '../../components/ui/BadgeDisplay';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { StatCard } from '../../components/modules/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatPoints } from '../../utils/formatting';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import { LEVEL_EMOJIS } from '../../types/domain.types';
import type { ChildProfile } from '../../types/api.types';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

// =============================================================================
// Child Switcher Component
// =============================================================================

function ChildSwitcher({
  children,
  activeChild,
  onSwitch,
}: {
  children: ChildProfile[];
  activeChild: ChildProfile | null;
  onSwitch: (child: ChildProfile) => void;
}) {
  if (children.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.childSwitcher}
      style={styles.childSwitcherScroll}
    >
      {children.map((child) => (
        <TouchableOpacity
          key={child.id}
          onPress={() => onSwitch(child)}
          style={[
            styles.childChip,
            activeChild?.id === child.id && styles.childChipActive,
          ]}
          activeOpacity={0.8}
        >
          <Text style={styles.childChipAvatar}>{child.avatar}</Text>
          <Text
            style={[
              styles.childChipName,
              activeChild?.id === child.id && styles.childChipNameActive,
            ]}
            numberOfLines={1}
          >
            {child.firstName}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// =============================================================================
// Profile Screen
// =============================================================================

export default function ProfileScreen() {
  const { t } = useTranslation();
  const {
    activeChild,
    children,
    childName,
    childLevel,
    childPoints,
    childTitle,
    switchChild,
    logout,
  } = useAuth();

  const {
    progression,
    levelInfo,
    badges,
    allBadges,
    isLoading,
    loadProgression,
    loadLevelInfo,
    loadBadges,
    loadAllBadges,
  } = useProgression('profile_session', activeChild?.id);

  useEffect(() => {
    if (activeChild) {
      loadProgression();
      loadLevelInfo();
      loadBadges();
      loadAllBadges();
    }
  }, [activeChild]);

  const handleSwitchChild = useCallback(
    (child: ChildProfile) => switchChild(child),
    [switchChild]
  );

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  const levelEmoji = LEVEL_EMOJIS[childLevel] || '🌱';
  const displayedBadges = badges.length > 0 ? badges : allBadges.slice(0, 3);
  const progressPercent = levelInfo?.progressPercent ?? 0;
  const speciesCount = activeChild?.speciesDiscovered?.length ?? 0;
  const quizzesDone = activeChild?.quizzesCompleted ?? 0;
  const totalMessages = progression?.totalMessages ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryDark]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerIconContainer}>
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <Path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </Svg>
          </View>
          <View>
            <Text style={styles.headerTitle}>{t('profile.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('profile.subtitle')}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scroll} 
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* ── Child Switcher ── */}
        <View style={styles.switcherContainer}>
          <ChildSwitcher
            children={children}
            activeChild={activeChild}
            onSwitch={handleSwitchChild}
          />
        </View>

        {/* ── Profile Card ── */}
        <View style={styles.profileCardWrapper}>
          <View style={styles.cardContainer}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileGradient}
            >
              <View style={styles.profileTop}>
                <View style={styles.avatarContainer}>
                  <Text style={styles.profileAvatar}>{levelEmoji}</Text>
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{childName}</Text>
                  <Text style={styles.profileTitle}>{childTitle}</Text>
                  <View style={styles.levelBadge}>
                    <Text style={styles.levelBadgeText}>{t('common.level')} {childLevel}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.pointsContainer}>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.accentLight} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </Svg>
                <Text style={styles.pointsText}>{formatPoints(childPoints)} {t('common.points')}</Text>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>{t('profile.progressToNextLevel')}</Text>
                  <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
                </View>
                <ProgressBar progress={progressPercent} color={Colors.accentLight} height={10} />
                {levelInfo && !levelInfo.isMaxLevel && levelInfo.pointsToNextLevel > 0 && (
                  <Text style={styles.progressSubtext}>
                    {formatPoints(levelInfo.pointsToNextLevel)} {t('profile.pointsToLevel')} {childLevel + 1}
                  </Text>
                )}
                {levelInfo?.isMaxLevel && (
                  <Text style={styles.progressSubtext}>{t('profile.maxLevel')}</Text>
                )}
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* ── Statistics ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.statistics')}</Text>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner message={t('profile.loadingStats')} size="small" />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <StatCard label={t('profile.species')} value={speciesCount} emoji="🌿" color={Colors.modules.explorer} />
              <StatCard label={t('profile.quizzes')} value={quizzesDone} emoji="⚡" color={Colors.modules.quiz} />
              <StatCard label={t('profile.messages')} value={totalMessages} emoji="💬" color={Colors.modules.chat} />
              <StatCard label={t('profile.badges')} value={badges.length} emoji="🏅" color={Colors.accent} />
            </View>
          )}
        </View>

        {/* ── Badges ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.badges')}</Text>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner message={t('profile.loadingBadges')} size="small" />
            </View>
          ) : displayedBadges.length > 0 ? (
            <View style={styles.badgesGrid}>
              {displayedBadges.map((badge) => (
                <BadgeDisplay key={badge.id} badge={badge} size="medium" />
              ))}
            </View>
          ) : (
            <View style={styles.emptyStateContainer}>
              <EmptyState
                emoji="🏅"
                title={t('profile.noBadges')}
                description={t('profile.noBadgesDesc')}
              />
            </View>
          )}
        </View>

        {/* ── Logout ── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.danger} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <Path d="M16 17l5-5-5-5" />
              <Path d="M21 12H9" />
            </Svg>
            <Text style={styles.logoutText}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </View>

        {/* Espace pour la navigation bottom */}
        <View style={{ height: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// =============================================================================
// Styles
// =============================================================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scroll: { flexGrow: 1 },

  // ── Header ──
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    marginBottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    color: Colors.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: Typography.weights.medium,
  },

  // ── Child Switcher ──
  switcherContainer: {
    marginTop: -Spacing.xl,
    marginBottom: Spacing.md,
    zIndex: 10,
  },
  childSwitcherScroll: {
    flexGrow: 0,
  },
  childSwitcher: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.gray200,
    ...Shadows.sm,
  },
  childChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySurface,
  },
  childChipAvatar: { fontSize: 22 },
  childChipName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.gray600,
  },
  childChipNameActive: {
    color: Colors.primaryDark,
    fontWeight: Typography.weights.bold,
  },

  // ── Profile Card Wrapper ──
  profileCardWrapper: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },

  // ── Profile Card ──
  cardContainer: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.lg,
  },
  profileGradient: {
    padding: Spacing.xl,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: { fontSize: 40 },
  profileInfo: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    color: Colors.white,
  },
  profileTitle: {
    fontSize: Typography.sizes.md,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: Typography.weights.semibold,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  levelBadgeText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },

  // ── Points ──
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  pointsText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.accentLight,
  },

  // ── Progress ──
  progressSection: {
    gap: Spacing.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: Typography.weights.semibold,
  },
  progressPercent: {
    fontSize: Typography.sizes.sm,
    color: Colors.white,
    fontWeight: Typography.weights.bold,
  },
  progressSubtext: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // ── Sections ──
  section: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.extrabold,
    color: Colors.black,
    marginBottom: Spacing.md,
  },

  // ── Stats ──
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },

  // ── Badges ──
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    justifyContent: 'flex-start',
  },
  emptyStateContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.sm,
  },

  // ── Loading ──
  loadingContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.sm,
  },

  // ── Logout ──
  logoutButton: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.danger,
    ...Shadows.sm,
  },
  logoutText: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.danger,
  },
});