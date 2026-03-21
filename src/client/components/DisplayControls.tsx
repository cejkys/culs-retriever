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
}: DisplayControlsProps) => (
  <div className={`flex items-center gap-2 ${className ?? ''}`}>
    <button
      type="button"
      aria-label={`${labels.themeToggle}: ${theme === 'dark' ? labels.dark : labels.light}`}
      title={`${labels.themeLabel}: ${theme === 'dark' ? labels.dark : labels.light}`}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800"
      onClick={onToggleTheme}
    >
      {theme === 'dark' ? <MoonIcon /> : <SunIcon />}
    </button>

    <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <span className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
        <GlobeIcon />
      </span>
      <button
        type="button"
        aria-label={labels.setEnglish}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
          language === 'en'
            ? 'bg-[#d93900] text-white'
            : 'text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800'
        }`}
        onClick={() => onLanguageChange('en')}
      >
        {labels.english}
      </button>
      <button
        type="button"
        aria-label={labels.setCzech}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
          language === 'cs'
            ? 'bg-[#d93900] text-white'
            : 'text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800'
        }`}
        onClick={() => onLanguageChange('cs')}
      >
        {labels.czech}
      </button>
    </div>
  </div>
);
