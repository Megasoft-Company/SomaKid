/**
 * SOMAKID AI - Login Screen
 * Parent authentication screen with email and password.
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
import { isValidEmail } from '../../utils/validation';
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '../../constants/theme';
import Svg, { Path, Circle } from 'react-native-svg';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const { login, isLoading, error, clearError } = useAuth();

  const handleLogin = async () => {
    clearError();

    if (!email.trim() || !password.trim()) {
      Alert.alert(t('common.error') || 'Error', t('login.errorEmpty'));
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert(t('common.error') || 'Error', t('login.errorEmail'));
      return;
    }

    try {
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <LinearGradient
            colors={[Colors.gradients.heroStart, Colors.gradients.heroMiddle, Colors.gradients.heroEnd]}
            style={styles.header}
          >
            <Svg width={64} height={64} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
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
            <Text style={styles.logo}>SOMAKID AI</Text>
            <Text style={styles.tagline}>
              {t('login.welcomeBack')}
            </Text>
          </LinearGradient>

          <View style={styles.form}>
            <Text style={styles.title}>{t('login.welcomeBack')}</Text>
            <Text style={styles.subtitle}>{t('login.signInContinue')}</Text>

            {error && <ErrorDisplay message={error} onRetry={clearError} />}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('login.email')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor={Colors.gray400}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('login.password')}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('login.passwordPlaceholder')}
                  placeholderTextColor={Colors.gray400}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? t('login.hide') : t('login.show')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, Shadows.colored(Colors.primary)]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <LoadingSpinner size="small" color={Colors.white} message="" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.loginButtonText}>{t('login.signInButton')}</Text>
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M5 12h14M12 5l7 7-7 7" />
                  </Svg>
                </View>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('login.noAccount')}</Text>
              <TouchableOpacity onPress={() => router.push('/screens/register')}>
                <Text style={styles.footerLink}>{t('login.createOne')}</Text>
              </TouchableOpacity>
            </View>

            {/* Child Login */}
            <TouchableOpacity
              style={styles.childLoginButton}
              onPress={() => router.push('/screens/child-login')}
            >
              <Text style={styles.childLoginText}>{t('login.childLogin')}</Text>
            </TouchableOpacity>
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
  header: {
    padding: Spacing['3xl'],
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing['4xl'],
    alignItems: 'center',
    gap: Spacing.md,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  logo: {
    fontSize: Typography.sizes['4xl'],
    fontWeight: Typography.weights.extrabold,
    color: Colors.white,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    padding: Spacing.xl,
    marginTop: -Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.extrabold,
    color: Colors.black,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.gray500,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  inputGroup: { marginBottom: Spacing.lg },
  label: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.gray700,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.gray100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.base,
    color: Colors.black,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 70 },
  eyeButton: {
    position: 'absolute',
    right: Spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeIcon: { fontSize: 12, fontWeight: Typography.weights.bold, color: Colors.gray500 },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    minHeight: 56,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loginButtonText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xl,
  },
  footerText: { fontSize: Typography.sizes.md, color: Colors.gray500 },
  footerLink: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.primary },
  childLoginButton: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.accent,
    borderRadius: BorderRadius.xl,
  },
  childLoginText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold, color: Colors.accent },
});