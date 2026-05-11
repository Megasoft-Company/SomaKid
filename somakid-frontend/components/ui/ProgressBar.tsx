/**
 * SOMAKID AI - Progress Bar Component
 * Animated progress bar for level progression.
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '../../constants/theme';

interface ProgressBarProps {
  progress: number;
  color?: string;
  backgroundColor?: string;
  height?: number;
  animated?: boolean;
  duration?: number;
}

export function ProgressBar({
  progress,
  color = Colors.primary,
  backgroundColor = Colors.gray200,
  height = 8,
  animated = true,
  duration = 500,
}: ProgressBarProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const targetProgress = Math.min(Math.max(progress, 0), 100);

    if (animated) {
      Animated.timing(widthAnim, {
        toValue: targetProgress,
        duration,
        useNativeDriver: false,
      }).start();
    } else {
      widthAnim.setValue(targetProgress);
    }
  }, [progress, animated, duration, widthAnim]);

  return (
    <View style={[styles.background, { backgroundColor, height, borderRadius: height / 2 }]}>
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: color,
            height,
            borderRadius: height / 2,
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {},
});