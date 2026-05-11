/**
 * SOMAKID AI - Onboarding Screen
 * Introduction screens for first-time users.
 * Full i18n integration with instant language switching.
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from '../../hooks/useTranslation';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  icon: React.ReactNode;
  titleKey: string;
  descriptionKey: string;
  color: readonly [string, string, ...string[]];
}

function OnboardingSlides({ t }: { t: (key: string) => string }) {
  return [
    {
      icon: (
        <Svg width={80} height={80} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z" />
          <Path d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
        </Svg>
      ),
      title: t('onboarding.slide1Title'),
      description: t('onboarding.slide1Desc'),
      color: [Colors.gradients.heroStart, Colors.gradients.heroEnd],
    },
    {
      icon: (
        <Svg width={80} height={80} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
          <Path d="M12 2v4" />
          <Path d="M12 18v4" />
          <Path d="M4.93 4.93l2.83 2.83" />
          <Path d="M16.24 16.24l2.83 2.83" />
          <Path d="M2 12h4" />
          <Path d="M18 12h4" />
          <Path d="M4.93 19.07l2.83-2.83" />
          <Path d="M16.24 7.76l2.83-2.83" />
        </Svg>
      ),
      title: t('onboarding.slide2Title'),
      description: t('onboarding.slide2Desc'),
      color: [Colors.secondary, Colors.secondaryLight],
    },
    {
      icon: (
        <Svg width={80} height={80} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </Svg>
      ),
      title: t('onboarding.slide3Title'),
      description: t('onboarding.slide3Desc'),
      color: [Colors.gradients.chatStart, Colors.gradients.chatEnd],
    },
  ];
}

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<any>>(null);
  const slides = OnboardingSlides({ t });

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex });
      setCurrentIndex(nextIndex);
    } else {
      router.replace('/screens/login');
    }
  };

  const handleSkip = () => {
    router.replace('/screens/login');
  };

  const renderSlide = ({ item }: { item: any }) => (
    <View style={styles.slide}>
      <LinearGradient colors={item.color} style={styles.slideGradient}>
        {item.icon}
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideDescription}>{item.description}</Text>
      </LinearGradient>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        keyExtractor={(_, index) => index.toString()}
      />

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNext}
            style={[styles.nextButton, Shadows.md]}
            activeOpacity={0.85}
          >
            <Text style={styles.nextText}>
              {currentIndex === slides.length - 1 ? t('onboarding.getStarted') : t('onboarding.next')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  slide: { width, flex: 1 },
  slideGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing['3xl'], gap: Spacing.xl },
  slideTitle: { fontSize: Typography.sizes['3xl'], fontWeight: Typography.weights.extrabold, color: Colors.white, textAlign: 'center' },
  slideDescription: { fontSize: Typography.sizes.lg, color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 28, paddingHorizontal: Spacing.xl },
  bottom: { padding: Spacing.xl, gap: Spacing.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.gray300 },
  dotActive: { width: 24, backgroundColor: Colors.primary },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipButton: { padding: Spacing.md },
  skipText: { fontSize: Typography.sizes.base, color: Colors.gray500 },
  nextButton: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing['2xl'], paddingVertical: Spacing.md },
  nextText: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: Colors.white },
});