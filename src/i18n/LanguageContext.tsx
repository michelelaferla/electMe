import {createContext, type ReactNode, useContext, useEffect, useMemo, useState} from 'react';
import {supabase} from '../lib/supabase';
import {
  FALLBACK_TRANSLATIONS,
  type LanguageCode,
  SUPPORTED_LANGUAGES,
  type TranslationDictionary
} from './translations';

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
  loadingTranslations: boolean;
};

const LANGUAGE_STORAGE_KEY = 'electme-language';
const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): LanguageCode {
  const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (saved === 'en' || saved === 'mt') return saved;

  const browserLanguage = navigator.language.toLowerCase();
  return browserLanguage.startsWith('mt') ? 'mt' : 'en';
}

function interpolate(value: string, params?: Record<string, string | number>) {
  if (!params) return value;
  return Object.entries(params).reduce((text, [key, replacement]) => text.split(`{${key}}`).join(String(replacement)), value);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(getInitialLanguage);
  const [remoteTranslations, setRemoteTranslations] = useState<Partial<Record<LanguageCode, TranslationDictionary>>>({});
  const [loadingTranslations, setLoadingTranslations] = useState(false);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    let cancelled = false;

    async function loadTranslations() {
      setLoadingTranslations(true);
      const { data, error } = await supabase
        .from('app_translations')
        .select('language_code,text_key,text_value')
        .eq('language_code', language)
        .eq('is_active', true);

      if (!cancelled) {
        if (!error && data) {
          setRemoteTranslations(current => ({
            ...current,
            [language]: Object.fromEntries(data.map(row => [row.text_key, row.text_value]))
          }));
        }
        setLoadingTranslations(false);
      }
    }

    loadTranslations();
    return () => { cancelled = true; };
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage: setLanguageState,
    supportedLanguages: SUPPORTED_LANGUAGES,
    loadingTranslations,
    t: (key, params) => {
      const remoteValue = remoteTranslations[language]?.[key];
      const fallbackValue = FALLBACK_TRANSLATIONS[language][key] ?? FALLBACK_TRANSLATIONS.en[key] ?? key;
      return interpolate(remoteValue ?? fallbackValue, params);
    }
  }), [language, loadingTranslations, remoteTranslations]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
