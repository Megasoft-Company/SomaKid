import { useState, useEffect, useCallback } from 'react';
import { t, getCurrentLanguage, onLanguageChange } from '../i18n';

/**
 * Hook pour utiliser les traductions dans les composants
 * Re-rend automatiquement quand la langue change
 */
export function useTranslation() {
  const [lang, setLang] = useState(getCurrentLanguage());
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsubscribe = onLanguageChange((newLang) => {
      setLang(newLang);
      forceUpdate(prev => prev + 1); // Force re-render
    });
    return unsubscribe;
  }, []);

  /**
   * Fonction de traduction liée au re-render
   */
  const translate = useCallback((key: string, params?: Record<string, string | number>) => {
    return t(key, params);
  }, [lang]);

  return {
    t: translate,
    currentLanguage: lang,
  };
}