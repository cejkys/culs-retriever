import { useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'culs-retriever-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const isTheme = (value: string | null): value is Theme => value === 'light' || value === 'dark';

export const useTheme = () => {
  const [userTheme, setUserTheme] = useState<Theme | null>(null);
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem(STORAGE_KEY);
        if (isTheme(savedTheme)) {
          setUserTheme(savedTheme);
        }
      } catch (error) {
        console.warn('[theme] failed to read localStorage', error);
      }
    }

    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia(DARK_QUERY);
    setSystemPrefersDark(mediaQuery.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, []);

  const theme = useMemo<Theme>(
    () => userTheme ?? (systemPrefersDark ? 'dark' : 'light'),
    [systemPrefersDark, userTheme]
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setUserTheme(nextTheme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, nextTheme);
      } catch (error) {
        console.warn('[theme] failed to write localStorage', error);
      }
    }
  };

  return { theme, toggleTheme } as const;
};
