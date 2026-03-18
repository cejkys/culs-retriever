import { useEffect, useId, useRef, useState } from 'react';
import type { Language } from '../i18n/translations';
import type { Theme } from '../hooks/useTheme';

type DisplayControlsProps = {
  theme: Theme;
  onToggleTheme: () => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  labels: {
    menuLabel: string;
    themeLabel: string;
    themeToggle: string;
    light: string;
    dark: string;
    languageLabel: string;
    english: string;
    czech: string;
    setEnglish: string;
    setCzech: string;
  };
  className?: string;
};

const iconClassName = 'h-4 w-4';

const MenuIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={iconClassName}
  >
    <path strokeLinecap="round" d="M4 7h16M7 12h13M10 17h10" />
  </svg>
);

const SunIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={iconClassName}
  >
    <circle cx="12" cy="12" r="4" />
    <path
      strokeLinecap="round"
      d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2M19.07 4.93l-1.77 1.77M6.7 17.3l-1.77 1.77M19.07 19.07l-1.77-1.77M6.7 6.7 4.93 4.93"
    />
  </svg>
);

const MoonIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={iconClassName}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
    />
  </svg>
);

const GlobeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    className={iconClassName}
  >
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);

export const DisplayControls = ({
  theme,
  onToggleTheme,
  language,
  onLanguageChange,
  labels,
  className,
}: DisplayControlsProps) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const currentThemeLabel = theme === 'dark' ? labels.dark : labels.light;

  return (
    <div ref={containerRef} className={`relative flex items-center justify-end ${className ?? ''}`}>
      <button
        type="button"
        aria-label={labels.menuLabel}
        aria-expanded={open}
        aria-controls={menuId}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800"
        onClick={() => setOpen((current) => !current)}
      >
        <MenuIcon />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute right-0 top-14 z-20 min-w-60 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
                <span>{labels.themeLabel}</span>
              </div>
              <button
                type="button"
                aria-label={labels.themeToggle}
                className="mt-2 inline-flex w-full items-center justify-between rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm transition-colors hover:bg-gray-100 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-950"
                onClick={() => {
                  onToggleTheme();
                  setOpen(false);
                }}
              >
                <span>{currentThemeLabel}</span>
                {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
              </button>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                <GlobeIcon />
                <span>{labels.languageLabel}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-label={labels.setEnglish}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    language === 'en'
                      ? 'bg-[#d93900] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-950'
                  }`}
                  onClick={() => {
                    onLanguageChange('en');
                    setOpen(false);
                  }}
                >
                  {labels.english}
                </button>
                <button
                  type="button"
                  aria-label={labels.setCzech}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    language === 'cs'
                      ? 'bg-[#d93900] text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-950'
                  }`}
                  onClick={() => {
                    onLanguageChange('cs');
                    setOpen(false);
                  }}
                >
                  {labels.czech}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
