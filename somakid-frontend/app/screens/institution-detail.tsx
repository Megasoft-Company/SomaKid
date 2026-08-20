/**
 * SOMAKID AI - Institution Detail Screen
 * An institution's programs (courses linked via institutionId).
 * Full i18n integration with instant language switching.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from '../../components/ui/EmptyState';
import { CourseCard } from '../../components/modules/CourseCard';
import { COURSES, INSTITUTIONS } from '../../constants/mockData';
import { onLanguageChange } from '../../i18n';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import Svg, { Path } from 'react-native-svg';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

const TYPE_KEY: Record<string, string> = {
  school: 'institutions.typeSchool',
  university: 'institutions.typeUniversity',
  ngo: 'institutions.typeNgo',
};

export default function InstitutionDetailScreen() {
  const { t } = useTranslation();
  const [, forceUpdate] = useState(0);
  const params = useLocalSearchParams<{ institutionId: string }>();

  useEffect(() => {
    const unsub = onLanguageChange(() => forceUpdate((v) => v + 1));
    return unsub;
  }, []);

  const institution = useMemo(() => INSTITUTIONS.find((i) => i.id === params.institutionId), [params.institutionId]);
  const programs = useMemo(
    () => COURSES.filter((c) => c.institutionId === params.institutionId),
    [params.institutionId]
  );

  const handleCoursePress = useCallback((courseId: string) => {
    router.push({ pathname: '/screens/course-detail', params: { courseId } } as any);
  }, []);

  if (!institution) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState emoji="🔎" title={t('learn.pathNotFound')} description={t('learn.pathNotFoundDesc')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[institution.color, institution.color + 'CC']} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.logoEmoji}>{institution.logoEmoji}</Text>
          <Text style={styles.name}>{institution.name}</Text>
          <Text style={styles.meta}>{t(TYPE_KEY[institution.type])} · {institution.city}, {institution.country}</Text>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={styles.description}>{institution.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('institutions.programs')}</Text>
          {programs.length === 0 ? (
            <EmptyState emoji="📚" title={t('institutions.noPrograms')} description="" />
          ) : (
            programs.map((course) => (
              <CourseCard key={course.id} course={course} onPress={() => handleCoursePress(course.id)} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scrollContent: { flexGrow: 1 },
  header: { padding: Spacing.xl, paddingTop: Spacing.lg, alignItems: 'center', gap: Spacing.sm, borderBottomLeftRadius: BorderRadius['2xl'], borderBottomRightRadius: BorderRadius['2xl'] },
  backButton: { position: 'absolute', top: Spacing.lg, left: Spacing.lg, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  logoEmoji: { fontSize: 48, marginTop: Spacing.xl },
  name: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.extrabold, color: Colors.white, textAlign: 'center' },
  meta: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.85)' },
  section: { paddingHorizontal: Spacing.base, paddingTop: Spacing.xl },
  description: { fontSize: Typography.sizes.base, color: Colors.gray700, lineHeight: 24 },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.extrabold, color: Colors.black, marginBottom: Spacing.md },
});
