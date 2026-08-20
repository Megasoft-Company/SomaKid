/**
 * SOMAKID AI - Book Detail Screen
 * Book info and mock save-to-My-Learning action.
 * Full i18n integration with instant language switching.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { EmptyState } from '../../components/ui/EmptyState';
import { BOOKS } from '../../constants/mockData';
import { useLearningSpaceStore } from '../../store/learningSpace.store';
import { onLanguageChange } from '../../i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import Svg, { Path } from 'react-native-svg';

const READING_LEVEL_LABEL: Record<string, string> = {
  early: 'early',
  independent: 'independent',
  advanced: 'advanced',
};

export default function BookDetailScreen() {
  const { t } = useTranslation();
  const [, forceUpdate] = useState(0);
  const params = useLocalSearchParams<{ bookId: string }>();
  const savedBookIds = useLearningSpaceStore((s) => s.savedBookIds);
  const toggleSavedBook = useLearningSpaceStore((s) => s.toggleSavedBook);

  useEffect(() => {
    const unsub = onLanguageChange(() => forceUpdate((v) => v + 1));
    return unsub;
  }, []);

  const book = useMemo(() => BOOKS.find((b) => b.id === params.bookId), [params.bookId]);
  const isSaved = book ? savedBookIds.includes(book.id) : false;

  if (!book) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <EmptyState emoji="🔎" title={t('learn.pathNotFound')} description={t('learn.pathNotFoundDesc')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={[book.color, book.color + 'CC']} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M15 18l-6-6 6-6" />
            </Svg>
          </TouchableOpacity>
          <View style={styles.cover}>
            <Text style={styles.coverEmoji}>{book.coverEmoji}</Text>
          </View>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{t('library.by')} {book.author}</Text>
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.metaRow}>
            <View style={[styles.metaBadge, { backgroundColor: book.isPremium ? Colors.accentSurface : Colors.successSurface }]}>
              <Text style={[styles.metaBadgeText, { color: book.isPremium ? Colors.accentDark : Colors.success }]}>
                {book.isPremium ? t('library.premium') : t('library.free')}
              </Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{book.pages} {t('library.pages')}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{t('library.readingLevel')}: {READING_LEVEL_LABEL[book.readingLevel]}</Text>
            </View>
          </View>

          <Text style={styles.description}>{book.description}</Text>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: book.isPremium ? Colors.gray300 : book.color }]}
            activeOpacity={book.isPremium ? 1 : 0.85}
            disabled={book.isPremium}
          >
            {book.isPremium && (
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={Colors.gray500} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" /><Path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </Svg>
            )}
            <Text style={[styles.primaryButtonText, book.isPremium && { color: Colors.gray500 }]}>
              {book.isPremium ? t('library.premiumComingSoon') : t('library.readCta')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, isSaved && { borderColor: book.color, backgroundColor: book.color + '15' }]}
            onPress={() => toggleSavedBook(book.id)}
            activeOpacity={0.85}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill={isSaved ? book.color : 'none'} stroke={isSaved ? book.color : Colors.gray500} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </Svg>
            <Text style={[styles.secondaryButtonText, isSaved && { color: book.color }]}>
              {isSaved ? t('library.saved') : t('library.save')}
            </Text>
          </TouchableOpacity>
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
  cover: { width: 96, height: 96, borderRadius: BorderRadius.xl, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xl },
  coverEmoji: { fontSize: 48 },
  title: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, color: Colors.white, textAlign: 'center' },
  author: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.85)' },
  section: { padding: Spacing.base, gap: Spacing.base },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  metaBadge: { backgroundColor: Colors.white, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 6, ...Shadows.sm },
  metaBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.gray600, textTransform: 'capitalize' },
  description: { fontSize: Typography.sizes.base, color: Colors.gray700, lineHeight: 24 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: BorderRadius.xl, paddingVertical: Spacing.md },
  primaryButtonText: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.white },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: BorderRadius.xl, paddingVertical: Spacing.md, borderWidth: 1.5, borderColor: Colors.gray300 },
  secondaryButtonText: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.gray600 },
});
