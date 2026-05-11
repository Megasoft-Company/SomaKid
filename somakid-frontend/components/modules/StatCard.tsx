/**
 * SOMAKID AI - Stat Card Component
 * Displays a statistic with label and emoji.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface StatCardProps {
  label: string;
  value: string | number;
  emoji: string;
  color?: string;
}

export function StatCard({ label, value, emoji, color = Colors.black }: StatCardProps) {
  return (
    <View style={[styles.container, Shadows.sm]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 26,
  },
  value: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
  },
  label: {
    fontSize: Typography.sizes.xs,
    color: Colors.gray500,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },
});