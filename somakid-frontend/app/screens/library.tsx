/**
 * SOMAKID AI - Library Screen
 * Digital book catalog (local mock data — no backend yet).
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
import { BOOKS } from '../../constants/mockData';
import { useLearningSpaceStore } from '../../store/learningSpace.store';
import { onLanguageChange } from '../../i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import Svg, { Path, Circle } from 'react-native-svg';

const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 88 : 68;
const BOTTOM_SAFE_AREA = Platform.OS === 'android' ? 24 : 0;

export default function LibraryScreen() {
  const { t } = useTranslation();
  const [, forceUpdate] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const savedBookIds = useLearningSpaceStore((s) => s.savedBookIds);

  useEffect(() => {
    const unsub = onLanguageChange(() => forceUpdate((v) => v + 1));
    return unsub;
  }, []);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return BOOKS;
    return BOOKS.filter(
      (book) => book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleBookPress = useCallback((bookId: string) => {
    router.push({ pathname: '/screens/book-detail', params: { bookId } } as any);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: TAB_BAR_HEIGHT + BOTTOM_SAFE_AREA + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={[Colors.modules.library, Colors.earthLight]} style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M15 18l-6-6 6-6" />
              </Svg>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{t('library.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('library.subtitle')}</Text>
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
              placeholder={t('library.searchPlaceholder')}
              placeholderTextColor={Colors.gray400}
            />
          </View>
        </LinearGradient>

        <View style={styles.grid}>
          {filteredBooks.length === 0 ? (
            <EmptyState emoji="🔎" title={t('library.noResults')} description={t('library.noResultsDesc')} />
          ) : (
            filteredBooks.map((book) => {
              const isSaved = savedBookIds.includes(book.id);
              return (
                <TouchableOpacity
                  key={book.id}
                  style={[styles.bookCard, Shadows.md]}
                  onPress={() => handleBookPress(book.id)}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={[book.color, book.color + 'CC']} style={styles.bookCover}>
                    <Text style={styles.bookEmoji}>{book.coverEmoji}</Text>
                    {isSaved && (
                      <View style={styles.savedBadge}>
                        <Svg width={12} height={12} viewBox="0 0 24 24" fill="#fff" stroke="#fff" strokeWidth={2}><Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></Svg>
                      </View>
                    )}
                  </LinearGradient>
                  <View style={styles.bookInfo}>
                    <View style={[styles.priceBadge, { backgroundColor: book.isPremium ? Colors.accentSurface : Colors.successSurface }]}>
                      <Text style={[styles.priceBadgeText, { color: book.isPremium ? Colors.accentDark : Colors.success }]}>
                        {book.isPremium ? t('library.premium') : t('library.free')}
                      </Text>
                    </View>
                    <Text style={styles.bookTitle} numberOfLines={2}>{book.title}</Text>
                    <Text style={styles.bookAuthor} numberOfLines={1}>{t('library.by')} {book.author}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.base, gap: Spacing.md, justifyContent: 'space-between' },
  bookCard: { width: '47%', borderRadius: BorderRadius.xl, overflow: 'hidden', backgroundColor: Colors.white, marginBottom: Spacing.sm },
  bookCover: { height: 100, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bookEmoji: { fontSize: 40 },
  savedBadge: { position: 'absolute', top: 8, right: 8 },
  bookInfo: { padding: Spacing.md, gap: 4 },
  priceBadge: { alignSelf: 'flex-start', borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2, marginBottom: 2 },
  priceBadgeText: { fontSize: 11, fontWeight: '800' },
  bookTitle: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.black, lineHeight: 18 },
  bookAuthor: { fontSize: 12, color: Colors.gray500 },
});
