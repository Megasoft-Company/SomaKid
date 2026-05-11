/**
 * SOMAKID AI - Badge Display Component
 * Shows an achievement badge with its details.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import type { Badge } from '../../types/api.types';
import { formatDate } from '../../utils/formatting';

interface BadgeDisplayProps {
  badge: Badge;
  size?: 'small' | 'medium' | 'large';
}

export function BadgeDisplay({ badge, size = 'medium' }: BadgeDisplayProps) {
  const sizeConfig = {
    small: { container: 60, icon: 40, emoji: 22 },
    medium: { container: 80, icon: 56, emoji: 30 },
    large: { container: 100, icon: 72, emoji: 40 },
  };

  const config = sizeConfig[size];

  return (
    <View style={[styles.container, { width: config.container }]}>
      <View
        style={[
          styles.iconContainer,
          {
            width: config.icon,
            height: config.icon,
            borderRadius: config.icon / 2,
            backgroundColor: badge.color + '20',
          },
        ]}
      >
        <Text style={[styles.emoji, { fontSize: config.emoji }]}>
          {badge.emoji}
        </Text>
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {badge.name}
      </Text>
      {badge.earnedAt && (
        <Text style={styles.date}>{formatDate(badge.earnedAt)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  emoji: {},
  name: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.gray700,
    textAlign: 'center',
  },
  date: {
    fontSize: 10,
    color: Colors.gray400,
  },
});