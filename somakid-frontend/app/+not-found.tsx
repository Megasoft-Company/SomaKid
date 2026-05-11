/**
 * SOMAKID AI - Not Found Screen
 * Displayed when a route is not found.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🔍</Text>
      <Text style={styles.title}>Page Not Found</Text>
      <Text style={styles.description}>
        The page you are looking for does not exist or has been moved.
      </Text>
      <TouchableOpacity
        style={[styles.button, Shadows.md]}
        onPress={() => router.replace('/(tabs)')}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>Go Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.gray100, padding: Spacing.xl },
  emoji: { fontSize: 72, marginBottom: Spacing.lg },
  title: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, color: Colors.black, marginBottom: Spacing.sm },
  description: { fontSize: Typography.sizes.md, color: Colors.gray500, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  button: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md },
  buttonText: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.white },
});