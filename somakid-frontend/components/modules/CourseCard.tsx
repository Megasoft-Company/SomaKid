/**
 * SOMAKID AI - Course Card Component
 * Card for a course/formation, used in the Courses catalog, Institution
 * program lists, and My Learning.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { Course } from '../../types/education.types';

interface CourseCardProps {
  course: Course;
  onPress: () => void;
  progress?: number;
}

export function CourseCard({ course, onPress, progress }: CourseCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} style={[styles.container, Shadows.md]}>
      <LinearGradient
        colors={[course.color, course.color + 'CC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>{course.emoji}</Text>
          </View>
          <View style={styles.badges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{course.isFree ? 'Gratuit' : `${course.priceUSD} $`}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
        <Text style={styles.tutor} numberOfLines={1}>{course.tutor.avatarEmoji} {course.tutor.name}</Text>
        <View style={styles.footer}>
          <Text style={styles.footerText}>{course.durationWeeks} sem.</Text>
          <View style={styles.dot} />
          <Text style={styles.footerText}>{course.level}</Text>
        </View>
        {typeof progress === 'number' && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.round(progress)}%` }]} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: BorderRadius['2xl'], overflow: 'hidden', marginBottom: Spacing.md },
  gradient: { padding: Spacing.lg, gap: Spacing.xs },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  emojiContainer: { width: 48, height: 48, borderRadius: BorderRadius.lg, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26 },
  badges: { flexDirection: 'row', gap: Spacing.xs },
  badge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '800', color: Colors.white },
  title: { fontSize: 17, fontWeight: '800', color: Colors.white, marginTop: Spacing.sm },
  tutor: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 2 },
  footerText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', textTransform: 'capitalize' },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)' },
  progressBar: { height: 4, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 2, overflow: 'hidden', marginTop: Spacing.sm },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: Colors.white },
});
