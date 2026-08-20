/**
 * SOMAKID AI - My Learning Screen
 * Hub for enrolled courses, saved books, badges and certificates.
 * Full i18n integration with instant language switching.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../hooks/useAuth';
import { StatCard } from '../../components/modules/StatCard';
import { CourseCard } from '../../components/modules/CourseCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { BadgeDisplay } from '../../components/ui/BadgeDisplay';
import { COURSES, BOOKS } from '../../constants/mockData';
import { useLearningSpaceStore } from '../../store/learningSpace.store';
import { onLanguageChange } from '../../i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import Svg, { Path } from 'react-native-svg';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

export default function MyLearningScreen() {
  const { t } = useTranslation();
  const [, forceUpdate] = useState(0);
  const { activeChild } = useAuth();
  const enrolledCourseIds = useLearningSpaceStore((s) => s.enrolledCourseIds);
  const courseProgress = useLearningSpaceStore((s) => s.courseProgress);
  const savedBookIds = useLearningSpaceStore((s) => s.savedBookIds);

  useEffect(() => {
    const unsub = onLanguageChange(() => forceUpdate((v) => v + 1));
    return unsub;
  }, []);

  const enrolledCourses = useMemo(
    () => COURSES.filter((c) => enrolledCourseIds.includes(c.id)),
    [enrolledCourseIds]
  );
  const savedBooks = useMemo(() => BOOKS.filter((b) => savedBookIds.includes(b.id)), [savedBookIds]);
  const badges = activeChild?.badges ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[Colors.modules.myLearning, Colors.accentDark]} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{t('myLearning.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('myLearning.subtitle')}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <StatCard label={t('myLearning.myCourses')} value={enrolledCourses.length} emoji="🎓" color={Colors.modules.courses} />
          <StatCard label={t('myLearning.myBooks')} value={savedBooks.length} emoji="📚" color={Colors.modules.library} />
          <StatCard label={t('myLearning.myBadges')} value={badges.length} emoji="🏅" color={Colors.accent} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('myLearning.myCourses')}</Text>
          {enrolledCourses.length === 0 ? (
            <View style={styles.emptyCard}>
              <EmptyState emoji="🎓" title={t('myLearning.noCoursesYet')} description={t('myLearning.noCoursesYetDesc')} />
            </View>
          ) : (
            enrolledCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                progress={courseProgress[course.id] ?? 0}
                onPress={() => router.push({ pathname: '/screens/course-detail', params: { courseId: course.id } } as any)}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('myLearning.myBooks')}</Text>
          {savedBooks.length === 0 ? (
            <View style={styles.emptyCard}>
              <EmptyState emoji="📚" title={t('myLearning.noBooksYet')} description={t('myLearning.noBooksYetDesc')} />
            </View>
          ) : (
            <View style={styles.bookRow}>
              {savedBooks.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  style={styles.bookChip}
                  onPress={() => router.push({ pathname: '/screens/book-detail', params: { bookId: book.id } } as any)}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={[book.color, book.color + 'CC']} style={styles.bookChipCover}>
                    <Text style={styles.bookChipEmoji}>{book.coverEmoji}</Text>
                  </LinearGradient>
                  <Text style={styles.bookChipTitle} numberOfLines={2}>{book.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('myLearning.myBadges')}</Text>
          {badges.length === 0 ? (
            <View style={styles.emptyCard}>
              <EmptyState emoji="🏅" title={t('profile.noBadges')} description={t('profile.noBadgesDesc')} />
            </View>
          ) : (
            <View style={styles.badgesGrid}>
              {badges.map((badge) => (
                <BadgeDisplay key={badge.id} badge={badge} size="medium" />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('myLearning.certificates')}</Text>
          <View style={styles.emptyCard}>
            <EmptyState emoji="📜" title={t('myLearning.noCertificatesYet')} description={t('myLearning.noCertificatesYetDesc')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scrollContent: { flexGrow: 1 },
  header: { padding: Spacing.xl, paddingTop: Spacing.lg, borderBottomLeftRadius: BorderRadius['2xl'], borderBottomRightRadius: BorderRadius['2xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, color: Colors.white },
  headerSubtitle: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.85)' },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.base, marginTop: -Spacing.lg },
  section: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.extrabold, color: Colors.black, marginBottom: Spacing.md },
  emptyCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, ...Shadows.sm },
  bookRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  bookChip: { width: 92 },
  bookChipCover: { width: 92, height: 92, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  bookChipEmoji: { fontSize: 36 },
  bookChipTitle: { fontSize: 12, fontWeight: '600', color: Colors.gray700, marginTop: 4, textAlign: 'center' },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
});
