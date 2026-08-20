/**
 * SOMAKID AI - Courses Screen
 * Catalog of tutor-led formations (local mock data — no backend yet).
 * Full i18n integration with instant language switching.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from '../../components/ui/EmptyState';
import { CourseCard } from '../../components/modules/CourseCard';
import { COURSES } from '../../constants/mockData';
import { onLanguageChange } from '../../i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { CourseCategory } from '../../types/education.types';
import Svg, { Path, Circle } from 'react-native-svg';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

const CATEGORIES: CourseCategory[] = ['biodiversity', 'climate', 'health', 'coding'];
const CATEGORY_KEY: Record<CourseCategory, string> = {
  biodiversity: 'courses.categoryBiodiversity',
  climate: 'courses.categoryClimate',
  health: 'courses.categoryHealth',
  coding: 'courses.categoryCoding',
};

export default function CoursesScreen() {
  const { t } = useTranslation();
  const [, forceUpdate] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CourseCategory | null>(null);

  useEffect(() => {
    const unsub = onLanguageChange(() => forceUpdate((v) => v + 1));
    return unsub;
  }, []);

  const filteredCourses = useMemo(() => {
    return COURSES.filter((course) => {
      const matchesCategory = !selectedCategory || course.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        course.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
        course.tutor.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const handleCoursePress = useCallback((courseId: string) => {
    router.push({ pathname: '/screens/course-detail', params: { courseId } } as any);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[Colors.modules.courses, Colors.secondaryDark]} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{t('courses.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('courses.subtitle')}</Text>
            </View>
          </View>

          <View style={styles.searchBar}>
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.gray400} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <Circle cx={11} cy={11} r={8} />
              <Path d="M21 21l-4.35-4.35" />
            </Svg>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('courses.searchPlaceholder')}
              placeholderTextColor={Colors.gray400}
            />
          </View>
        </LinearGradient>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            onPress={() => setSelectedCategory(null)}
            style={[styles.filterChip, !selectedCategory && styles.filterChipActive]}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, !selectedCategory && styles.filterChipTextActive]}>{t('courses.filterAll')}</Text>
          </TouchableOpacity>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
                {t(CATEGORY_KEY[cat])}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.listSection}>
          {filteredCourses.length === 0 ? (
            <EmptyState emoji="🔎" title={t('courses.noResults')} description={t('courses.noResultsDesc')} />
          ) : (
            filteredCourses.map((course) => (
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
  header: { padding: Spacing.xl, paddingTop: Spacing.lg, gap: Spacing.lg, borderBottomLeftRadius: BorderRadius['2xl'], borderBottomRightRadius: BorderRadius['2xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, color: Colors.white },
  headerSubtitle: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.85)' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.white, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, ...Shadows.sm },
  searchInput: { flex: 1, fontSize: Typography.sizes.base, color: Colors.black },
  filterRow: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.lg, gap: Spacing.sm },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200 },
  filterChipActive: { backgroundColor: Colors.modules.courses, borderColor: Colors.modules.courses },
  filterChipText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.gray600 },
  filterChipTextActive: { color: Colors.white },
  listSection: { paddingHorizontal: Spacing.base },
});
