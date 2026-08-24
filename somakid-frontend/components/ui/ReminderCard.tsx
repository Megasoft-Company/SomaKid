/**
 * SOMAKID AI - Reminder Card
 * Lightweight in-app health reminder banner (no push notifications).
 * Cycles through a short list of tips, dismissible per session.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';

interface ReminderCardProps {
  tips: string[];
  color?: string;
  emoji?: string;
}

export function ReminderCard({ tips, color = Colors.modules.health, emoji = '💡' }: ReminderCardProps) {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (tips.length <= 1) return;
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
      setIndex((prev) => (prev + 1) % tips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [tips.length]);

  if (dismissed || tips.length === 0) return null;

  return (
    <View style={[styles.container, Shadows.sm, { borderLeftColor: color }]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Animated.Text style={[styles.text, { opacity: fadeAnim }]} numberOfLines={2}>
        {tips[index]}
      </Animated.Text>
      <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.gray400} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M18 6L6 18M6 6l12 12" />
        </Svg>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.md,
    gap: Spacing.sm,
    borderLeftWidth: 4,
  },
  emoji: { fontSize: 20 },
  text: { flex: 1, fontSize: Typography.sizes.sm, color: Colors.gray700, fontWeight: Typography.weights.medium, lineHeight: 18 },
});
