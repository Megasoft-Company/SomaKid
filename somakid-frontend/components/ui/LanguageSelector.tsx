import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { getCurrentLanguage, setLanguage, SUPPORTED_LANGUAGES, getLanguageInfo } from '../../i18n';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../constants/theme';
import Svg, { Path } from 'react-native-svg';

interface LanguageSelectorProps {
  isVisible: boolean;
  onClose: () => void;
  onLanguageChanged?: (lang: string) => void; // ← Callback pour notifier le parent
}

export function LanguageSelector({ isVisible, onClose, onLanguageChanged }: LanguageSelectorProps) {
  const [selectedLang, setSelectedLang] = useState(getCurrentLanguage());

  const handleSelectLanguage = async (langCode: string) => {
    setSelectedLang(langCode);
    await setLanguage(langCode);
    
    // Notifier le parent du changement
    if (onLanguageChanged) {
      onLanguageChanged(langCode);
    }
    
    // Fermer après un court délai
    setTimeout(() => {
      onClose();
    }, 200);
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M12 2a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" />
                <Path d="M2 12h20" />
                <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </Svg>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Changer la langue</Text>
                <Text style={styles.modalSubtitle}>Select language / Chagua lugha</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={Colors.gray500} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M18 6L6 18M6 6l12 12" />
                </Svg>
              </TouchableOpacity>
            </View>

            {/* Liste des langues */}
            <ScrollView showsVerticalScrollIndicator={false} style={styles.languageList} bounces={false}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = selectedLang === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[styles.languageItem, isSelected && styles.languageItemSelected]}
                    onPress={() => handleSelectLanguage(lang.code)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.languageInfo}>
                      <Text style={styles.languageFlag}>{lang.flag}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>
                          {lang.nativeName}
                        </Text>
                        <Text style={styles.languageNameEn}>{lang.name}</Text>
                      </View>
                    </View>
                    {isSelected && (
                      <View style={styles.checkIcon}>
                        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={Colors.primary} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                          <Path d="M20 6L9 17l-5-5" />
                        </Svg>
                      </View>
                    )}
                    {!isSelected && (
                      <View style={styles.radioCircle} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
    ...Shadows.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    gap: Spacing.md,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.black,
  },
  modalSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.gray500,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageList: {
    maxHeight: 350,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  languageItemSelected: {
    backgroundColor: Colors.primarySurface,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  languageFlag: {
    fontSize: 32,
  },
  languageName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.black,
  },
  languageNameSelected: {
    color: Colors.primary,
    fontWeight: Typography.weights.bold,
  },
  languageNameEn: {
    fontSize: Typography.sizes.xs,
    color: Colors.gray500,
  },
  checkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.gray300,
  },
});