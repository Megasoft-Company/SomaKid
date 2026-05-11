/**
 * SOMAKID AI - Module Card Component
 * Card for navigating to application modules.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface ModuleCardProps {
  emoji: string;
  title: string;
  description: string;
  color: string;
  onPress: () => void;
}

export function ModuleCard({ emoji, title, description, color, onPress }: ModuleCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.container, Shadows.md]}
    >
      <LinearGradient
        colors={[color, color + 'DD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <Text style={styles.arrow}>{'>'}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  emoji: {
    fontSize: 38,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    marginBottom: 2,
  },
  description: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: Typography.weights.regular,
  },
  arrow: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '300',
  },
});