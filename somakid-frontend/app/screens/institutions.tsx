/**
 * SOMAKID AI - Institutions Screen
 * List of partner schools, universities and organizations (local mock data).
 * Full i18n integration with instant language switching.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { INSTITUTIONS } from '../../constants/mockData';
import { onLanguageChange } from '../../i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import Svg, { Path } from 'react-native-svg';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

const TYPE_KEY: Record<string, string> = {
  school: 'institutions.typeSchool',
  university: 'institutions.typeUniversity',
  ngo: 'institutions.typeNgo',
};

export default function InstitutionsScreen() {
  const { t } = useTranslation();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsub = onLanguageChange(() => forceUpdate((v) => v + 1));
    return unsub;
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[Colors.modules.institutions, '#8E2C21']} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{t('institutions.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('institutions.subtitle')}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.listSection}>
          {INSTITUTIONS.map((inst) => (
            <TouchableOpacity
              key={inst.id}
              style={[styles.card, Shadows.md]}
              onPress={() => router.push({ pathname: '/screens/institution-detail', params: { institutionId: inst.id } } as any)}
              activeOpacity={0.9}
            >
              <View style={[styles.logoContainer, { backgroundColor: inst.color + '18' }]}>
                <Text style={styles.logoEmoji}>{inst.logoEmoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardName} numberOfLines={1}>{inst.name}</Text>
                <Text style={styles.cardMeta}>{t(TYPE_KEY[inst.type])} · {inst.city}</Text>
              </View>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.gray400} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M9 18l6-6-6-6" />
              </Svg>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.gray100 },
  scrollContent: { flexGrow: 1 },
  header: { padding: Spacing.xl, paddingTop: Spacing.lg, borderBottomLeftRadius: BorderRadius['2xl'], borderBottomRightRadius: BorderRadius['2xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, color: Colors.white },
  headerSubtitle: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.85)' },
  listSection: { padding: Spacing.base },
  card: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.base, marginBottom: Spacing.sm },
  logoContainer: { width: 52, height: 52, borderRadius: BorderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 28 },
  cardName: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.black },
  cardMeta: { fontSize: Typography.sizes.sm, color: Colors.gray500, marginTop: 2 },
});
