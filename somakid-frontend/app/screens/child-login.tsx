/**
 * SOMAKID AI - Child Login Screen
 * Child authentication with avatar selection and PIN entry.
 * Full i18n integration with instant language switching.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { isValidChildPIN } from '../../utils/validation';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  CHILD_AVATARS,
} from '../../constants/theme';
import Svg, { Path } from 'react-native-svg';

export default function ChildLoginScreen() {
  const { t } = useTranslation();
  const [selectedAvatar, setSelectedAvatar] = useState<string>(CHILD_AVATARS[0]);
  const [pin, setPin] = useState('');
  const [childId] = useState('');
  const [step, setStep] = useState<'avatar' | 'pin'>('avatar');

  const { loginAsChild, isLoading, clearError } = useAuth();

  const handleAvatarSelect = (avatar: string) => {
    setSelectedAvatar(avatar);
    setStep('pin');
  };

  const handlePinSubmit = async () => {
    if (!isValidChildPIN(pin)) {
      Alert.alert(t('common.error') || 'Error', t('childLogin.errorPIN'));
      return;
    }

    try {
      await loginAsChild(childId || 'default', pin);
      router.replace('/(tabs)');
    } catch {
      Alert.alert(t('common.error') || 'Error', t('childLogin.errorInvalid'));
      setPin('');
    }
  };

  const handleBackToAvatar = () => {
    setStep('avatar');
    setPin('');
    clearError();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={[Colors.accent, Colors.gradients.quizStart]}
          style={styles.header}
        >
          <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </Svg>
          <Text style={styles.headerTitle}>{t('childLogin.hello')}</Text>
          <Text style={styles.headerSubtitle}>{t('childLogin.subtitle')}</Text>
        </LinearGradient>

        <View style={styles.content}>
          {step === 'avatar' ? (
            <>
              <Text style={styles.sectionTitle}>{t('childLogin.whoAreYou')}</Text>
              <View style={styles.avatarGrid}>
                {CHILD_AVATARS.map((avatar) => (
                  <TouchableOpacity
                    key={avatar}
                    onPress={() => handleAvatarSelect(avatar)}
                    style={styles.avatarButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.avatarEmoji}>{avatar}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <View style={styles.selectedAvatarContainer}>
                <Text style={styles.selectedAvatar}>{selectedAvatar}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('childLogin.enterPIN')}</Text>
                <TextInput
                  style={styles.pinInput}
                  value={pin}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '');
                    if (cleaned.length <= 4) setPin(cleaned);
                  }}
                  placeholder={t('childLogin.pinPlaceholder')}
                  placeholderTextColor={Colors.gray400}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  autoFocus
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, Shadows.colored(Colors.accent)]}
                onPress={handlePinSubmit}
                disabled={isLoading || pin.length !== 4}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <LoadingSpinner size="small" color={Colors.white} message="" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.submitButtonText}>{t('childLogin.enter')}</Text>
                    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M5 12h14M12 5l7 7-7 7" />
                    </Svg>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToAvatar}
              >
                <Text style={styles.backButtonText}>{t('childLogin.differentAvatar')}</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={styles.parentButton}
            onPress={() => router.push('/screens/login')}
          >
            <Text style={styles.parentButtonText}>{t('childLogin.parent')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scroll: { flexGrow: 1 },
  header: { padding: Spacing['3xl'], paddingTop: Spacing['4xl'], alignItems: 'center', gap: Spacing.md },
  headerTitle: { fontSize: Typography.sizes['3xl'], fontWeight: Typography.weights.extrabold, color: Colors.white },
  headerSubtitle: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
  content: { padding: Spacing.xl, alignItems: 'center' },
  sectionTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: Colors.black, marginBottom: Spacing.xl },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.md },
  avatarButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: Colors.primarySurface, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.gray200 },
  avatarEmoji: { fontSize: 34 },
  selectedAvatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.accentSurface, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.xl, borderWidth: 3, borderColor: Colors.accent },
  selectedAvatar: { fontSize: 50 },
  inputGroup: { width: '100%', marginBottom: Spacing.xl, alignItems: 'center' },
  label: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.semibold, color: Colors.gray700, marginBottom: Spacing.lg },
  pinInput: { width: 200, height: 60, backgroundColor: Colors.gray100, borderRadius: BorderRadius.xl, textAlign: 'center', fontSize: Typography.sizes['3xl'], fontWeight: Typography.weights.bold, color: Colors.black, letterSpacing: 8, borderWidth: 2, borderColor: Colors.gray200 },
  submitButton: { width: '100%', backgroundColor: Colors.accent, borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center', minHeight: 56, justifyContent: 'center' },
  submitButtonText: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.white },
  backButton: { marginTop: Spacing.lg, padding: Spacing.md },
  backButtonText: { fontSize: Typography.sizes.md, color: Colors.gray500, fontWeight: Typography.weights.medium },
  parentButton: { marginTop: Spacing['3xl'], padding: Spacing.md, borderWidth: 1, borderColor: Colors.gray300, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.xl },
  parentButtonText: { fontSize: Typography.sizes.md, color: Colors.gray500 },
});