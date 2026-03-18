import { useEffect, useMemo, useState } from 'react';
import { translations, type Language } from '../i18n/translations';

const STORAGE_KEY = 'culs-retriever-language';

const isLanguage = (value: string | null): value is Language => value === 'en' || value === 'cs';

const detectLanguage = (): Language => {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language.toLowerCase().startsWith('cs') ? 'cs' : 'en';
};

export const useLanguage = () => {
  const [language, setLanguageState] = useState<Language>(() => detectLanguage());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (isLanguage(saved)) {
        setLanguageState(saved);
      }
    } catch (error) {
      console.warn('[language] failed to read localStorage', error);
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch (error) {
      console.warn('[language] failed to write localStorage', error);
    }
  };

  const t = useMemo(() => translations[language], [language]);

  return { language, setLanguage, t } as const;
};
