/**
 * SOMAKID AI - Course Detail Screen
 * Curriculum, tutor summary, and mock enrollment for a single course.
 * Full i18n integration with instant language switching.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { COURSES } from '../../constants/mockData';
import { useLearningSpaceStore } from '../../store/learningSpace.store';
import { onLanguageChange } from '../../i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import Svg, { Path } from 'react-native-svg';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

const LEVEL_KEY: Record<string, string> = {
  beginner: 'courses.levelBeginner',
  intermediate: 'courses.levelIntermediate',
  advanced: 'courses.levelAdvanced',
};

export default function CourseDetailScreen() {
  const { t } = useTranslation();
  const [, forceUpdate] = useState(0);
  const params = useLocalSearchParams<{ courseId: string }>();
  const enrolledCourseIds = useLearningSpaceStore((s) => s.enrolledCourseIds);
  const courseProgress = useLearningSpaceStore((s) => s.courseProgress);
  const enrollInCourse = useLearningSpaceStore((s) => s.enrollInCourse);

  useEffect(() => {
    const unsub = onLanguageChange(() => forceUpdate((v) => v + 1));
    return unsub;
  }, []);

  const course = useMemo(() => COURSES.find((c) => c.id === params.courseId), [params.courseId]);
  const isEnrolled = course ? enrolledCourseIds.includes(course.id) : false;
  const progress = course ? courseProgress[course.id] ?? 0 : 0;

  if (!course) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState emoji="🔎" title={t('learn.pathNotFound')} description={t('learn.pathNotFoundDesc')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[course.color, course.color + 'CC']} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.headerEmoji}>{course.emoji}</Text>
          <Text style={styles.headerTitle}>{course.title}</Text>
          <View style={styles.headerMetaRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{course.durationWeeks} {t('courses.weeks')}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{t(LEVEL_KEY[course.level])}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{course.isFree ? t('courses.free') : `${course.priceUSD} $`}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('courses.aboutTutor')}</Text>
          <View style={[styles.tutorCard, Shadows.sm]}>
            <Text style={styles.tutorAvatar}>{course.tutor.avatarEmoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.tutorName}>{course.tutor.name}</Text>
              <Text style={styles.tutorBio}>{course.tutor.bio}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{course.description}</Text>
        </View>

        {isEnrolled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('myLearning.progress')}</Text>
            <View style={[styles.progressCard, Shadows.sm]}>
              <ProgressBar progress={progress} color={course.color} height={10} />
              <Text style={styles.progressText}>{Math.round(progress)}%</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('courses.curriculum')}</Text>
          {course.curriculum.map((mod, index) => (
            <View key={mod.id} style={[styles.moduleCard, Shadows.sm]}>
              <View style={[styles.moduleBadge, { backgroundColor: course.color }]}>
                <Text style={styles.moduleBadgeText}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.moduleTitle}>{mod.title}</Text>
                {mod.lessonTitles.map((lesson, i) => (
                  <Text key={i} style={styles.lessonText}>• {lesson}</Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.ctaBar, Shadows.lg]}>
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: isEnrolled ? Colors.success : course.color }]}
          onPress={() => !isEnrolled && enrollInCourse(course.id)}
          activeOpacity={0.85}
          disabled={isEnrolled}
        >
          {isEnrolled && (
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M20 6L9 17l-5-5" />
            </Svg>
          )}
          <Text style={styles.ctaButtonText}>{isEnrolled ? t('courses.enrolledLabel') : t('courses.enrollCta')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scrollContent: { flexGrow: 1 },
  header: { padding: Spacing.xl, paddingTop: Spacing.lg, alignItems: 'center', gap: Spacing.sm, borderBottomLeftRadius: BorderRadius['2xl'], borderBottomRightRadius: BorderRadius['2xl'] },
  backButton: { position: 'absolute', top: Spacing.lg, left: Spacing.lg, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  headerEmoji: { fontSize: 56, marginTop: Spacing.xl },
  headerTitle: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, color: Colors.white, textAlign: 'center' },
  headerMetaRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs },
  metaBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 4 },
  metaBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.white, textTransform: 'capitalize' },
  section: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.extrabold, color: Colors.black, marginBottom: Spacing.md },
  tutorCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.base },
  tutorAvatar: { fontSize: 40 },
  tutorName: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.black },
  tutorBio: { fontSize: Typography.sizes.sm, color: Colors.gray500, marginTop: 2, lineHeight: 18 },
  progressCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.base, gap: Spacing.sm },
  progressText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.gray600 },
  moduleCard: { flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.base, marginBottom: Spacing.sm },
  moduleBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  moduleBadgeText: { fontSize: 13, fontWeight: '800', color: Colors.white },
  moduleTitle: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.black, marginBottom: 4 },
  lessonText: { fontSize: Typography.sizes.sm, color: Colors.gray500, lineHeight: 20 },
  ctaBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white, padding: Spacing.base, paddingBottom: Spacing.xl },
  ctaButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: BorderRadius.xl, paddingVertical: Spacing.md },
  ctaButtonText: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.white },
});
