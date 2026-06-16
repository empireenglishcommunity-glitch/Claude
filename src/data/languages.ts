export type Language = {
  /** Code understood by the online translation endpoint. */
  code: string;
  label: string; // English label
  native: string; // native label
  flag: string;
  /** True when meanings ship offline (currently only Arabic, in the curated set). */
  offline?: boolean;
  rtl?: boolean;
};

/** Default translation language for the Arab-world audience. */
export const DEFAULT_LANGUAGE_CODE = 'ar';

export const LANGUAGES: Language[] = [
  { code: 'ar', label: 'Arabic', native: 'العربية', flag: '🇸🇦', offline: true, rtl: true },
  { code: 'es', label: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'ur', label: 'Urdu', native: 'اردو', flag: '🇵🇰', rtl: true },
  { code: 'fa', label: 'Persian', native: 'فارسی', flag: '🇮🇷', rtl: true },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'id', label: 'Indonesian', native: 'Indonesia', flag: '🇮🇩' },
  { code: 'pt', label: 'Portuguese', native: 'Português', flag: '🇵🇹' },
  { code: 'ru', label: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { code: 'zh-CN', label: 'Chinese', native: '中文', flag: '🇨🇳' },
  { code: 'ja', label: 'Japanese', native: '日本語', flag: '🇯🇵' },
];

export function getLanguage(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
