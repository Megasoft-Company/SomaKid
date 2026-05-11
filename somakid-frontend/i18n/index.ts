import AsyncStorage from '@react-native-async-storage/async-storage';

// Importer toutes les langues
import fr from './locales/fr';
import en from './locales/en';
import ln from './locales/ln';
import sw from './locales/sw'; // ← Ajouter l'import Swahili

// Types pour les traductions
type TranslationValue = string | { [key: string]: TranslationValue };
export type Translations = { [key: string]: TranslationValue };

// Toutes les langues disponibles
const translations: { [lang: string]: Translations } = {
  fr,
  en,
  ln,
  sw, // ← Ajouter le Swahili
};

// Langues supportées
export const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ln', name: 'Lingala', nativeName: 'Lingála', flag: '🇨🇩' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', flag: '🇹🇿' },
];

// Clé de stockage pour la langue
const LANGUAGE_STORAGE_KEY = 'somakid_language';

// Langue par défaut
const DEFAULT_LANGUAGE = 'fr';

// État actuel de la langue
let currentLanguage: string = DEFAULT_LANGUAGE;
let currentTranslations: Translations = translations[DEFAULT_LANGUAGE];

// Callbacks pour les changements de langue
type LanguageChangeListener = (lang: string) => void;
const listeners: LanguageChangeListener[] = [];

/**
 * Récupère une traduction par sa clé (ex: 'home.hello')
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const keys = key.split('.');
  let value: any = currentTranslations;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback vers le français si la clé n'existe pas
      let fallback: any = translations[DEFAULT_LANGUAGE];
      for (const fk of keys) {
        if (fallback && typeof fallback === 'object' && fk in fallback) {
          fallback = fallback[fk];
        } else {
          return key;
        }
      }
      return typeof fallback === 'string' ? replaceParams(fallback, params) : key;
    }
  }

  if (typeof value === 'string') {
    return replaceParams(value, params);
  }

  return key;
}

/**
 * Remplace les paramètres {{param}} dans une chaîne
 */
function replaceParams(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{{${key}}}`;
  });
}

/**
 * Change la langue courante
 */
export async function setLanguage(lang: string): Promise<void> {
  if (!translations[lang]) {
    console.warn(`Langue "${lang}" non disponible, fallback vers "${DEFAULT_LANGUAGE}"`);
    lang = DEFAULT_LANGUAGE;
  }

  currentLanguage = lang;
  currentTranslations = translations[lang];

  // Sauvegarder la préférence
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (e) {
    console.warn('Erreur lors de la sauvegarde de la langue:', e);
  }

  // Notifier tous les listeners
  listeners.forEach(listener => listener(lang));
}

/**
 * Ajoute un listener pour les changements de langue
 */
export function onLanguageChange(listener: LanguageChangeListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  };
}

/**
 * Récupère la langue courante
 */
export function getCurrentLanguage(): string {
  return currentLanguage;
}

/**
 * Récupère les traductions courantes
 */
export function getTranslations(): Translations {
  return currentTranslations;
}

/**
 * Récupère les informations d'une langue
 */
export function getLanguageInfo(code: string) {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

/**
 * Initialise la langue au démarrage
 */
export async function initLanguage(): Promise<string> {
  try {
    const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLang && translations[savedLang]) {
      await setLanguage(savedLang);
      return savedLang;
    }
  } catch (e) {
    console.warn('Erreur lors du chargement de la langue:', e);
  }

  await setLanguage(DEFAULT_LANGUAGE);
  return DEFAULT_LANGUAGE;
}