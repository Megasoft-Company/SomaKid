/**
 * SOMAKID AI - Register Screen
 * Parent account creation screen.
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
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from '../../hooks/useTranslation';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { isValidEmail, isStrongPassword, getPasswordStrength } from '../../utils/validation';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import Svg, { Path } from 'react-native-svg';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { register, isLoading, error, clearError } = useAuth();

  const passwordStrength = getPasswordStrength(password);

  const handleRegister = async () => {
    clearError();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      Alert.alert(t('common.error') || 'Error', t('register.errorEmpty'));
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert(t('common.error') || 'Error', t('register.errorEmail'));
      return;
    }

    if (!isStrongPassword(password)) {
      Alert.alert(t('common.error') || 'Error', t('register.errorPassword'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('common.error') || 'Error', t('register.errorMatch'));
      return;
    }

    try {
      await register({
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        email: email.trim(),
        password,
        passwordConfirmation: confirmPassword,
      });
      router.replace('/(tabs)');
    } catch {
      // Error handled by store
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <LinearGradient
            colors={[Colors.gradients.heroStart, Colors.gradients.heroMiddle]}
            style={styles.header}
          >
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <Path d="M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
              <Path d="M20 8v6M23 11h-6" />
            </Svg>
            <Text style={styles.headerTitle}>{t('register.createAccount')}</Text>
            <Text style={styles.headerSubtitle}>{t('register.joinCommunity')}</Text>
          </LinearGradient>

          <View style={styles.form}>
            {error && <ErrorDisplay message={error} onRetry={clearError} />}

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>{t('register.firstName')}</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t('register.firstNamePlaceholder')}
                  placeholderTextColor={Colors.gray400}
                  editable={!isLoading}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>{t('register.lastName')}</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={t('register.lastNamePlaceholder')}
                  placeholderTextColor={Colors.gray400}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('register.email')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t('register.emailPlaceholder')}
                placeholderTextColor={Colors.gray400}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('register.password')}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder={t('register.passwordPlaceholder')}
                placeholderTextColor={Colors.gray400}
                secureTextEntry
                editable={!isLoading}
              />
              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  <Text style={styles.strengthLabel}>{t('register.passwordStrength')}:</Text>
                  <Text style={[styles.strengthValue, {
                    color: passwordStrength === 'strong' ? Colors.success : passwordStrength === 'medium' ? Colors.accent : Colors.danger,
                  }]}>
                    {passwordStrength === 'strong' ? t('register.strong') : passwordStrength === 'medium' ? t('register.medium') : t('register.weak')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('register.confirmPassword')}</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={t('register.confirmPasswordPlaceholder')}
                placeholderTextColor={Colors.gray400}
                secureTextEntry
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.registerButton, Shadows.colored(Colors.primary)]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <LoadingSpinner size="small" color={Colors.white} message="" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.registerButtonText}>{t('register.createButton')}</Text>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M5 12h14M12 5l7 7-7 7" />
                  </Svg>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('register.alreadyAccount')}</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.footerLink}>{t('register.signIn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: { padding: Spacing.xl, paddingTop: Spacing['3xl'], paddingBottom: Spacing['2xl'], alignItems: 'center', gap: Spacing.md },
  headerTitle: { fontSize: Typography.sizes['2xl'], fontWeight: Typography.weights.extrabold, color: Colors.white },
  headerSubtitle: { fontSize: Typography.sizes.md, color: 'rgba(255,255,255,0.8)' },
  form: { padding: Spacing.xl },
  row: { flexDirection: 'row', gap: Spacing.md },
  halfWidth: { flex: 1 },
  inputGroup: { marginBottom: Spacing.lg },
  label: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: Colors.gray700, marginBottom: Spacing.sm },
  input: { backgroundColor: Colors.gray100, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: Typography.sizes.base, color: Colors.black, borderWidth: 1, borderColor: Colors.gray200 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  strengthLabel: { fontSize: Typography.sizes.sm, color: Colors.gray500 },
  strengthValue: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  registerButton: { backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.lg, alignItems: 'center', marginTop: Spacing.md, minHeight: 56, justifyContent: 'center', flexDirection: 'row' },
  registerButtonText: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.white },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.xs, marginTop: Spacing.xl },
  footerText: { fontSize: Typography.sizes.md, color: Colors.gray500 },
  footerLink: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.primary },
});