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
  { code: 'it', label: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Portuguese', native: 'Português', flag: '🇵🇹' },
  { code: 'ru', label: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { code: 'tr', label: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'ur', label: 'Urdu', native: 'اردو', flag: '🇵🇰', rtl: true },
  { code: 'fa', label: 'Persian', native: 'فارسی', flag: '🇮🇷', rtl: true },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', flag: '🇧🇩' },
  { code: 'id', label: 'Indonesian', native: 'Indonesia', flag: '🇮🇩' },
  { code: 'ms', label: 'Malay', native: 'Melayu', flag: '🇲🇾' },
  { code: 'zh-CN', label: 'Chinese (Simplified)', native: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', label: 'Chinese (Traditional)', native: '繁體中文', flag: '🇹🇼' },
  { code: 'ja', label: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'vi', label: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'th', label: 'Thai', native: 'ไทย', flag: '🇹🇭' },
  { code: 'nl', label: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', label: 'Polish', native: 'Polski', flag: '🇵🇱' },
  { code: 'uk', label: 'Ukrainian', native: 'Українська', flag: '🇺🇦' },
  { code: 'ro', label: 'Romanian', native: 'Română', flag: '🇷🇴' },
  { code: 'el', label: 'Greek', native: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'sv', label: 'Swedish', native: 'Svenska', flag: '🇸🇪' },
  { code: 'no', label: 'Norwegian', native: 'Norsk', flag: '🇳🇴' },
  { code: 'da', label: 'Danish', native: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', label: 'Finnish', native: 'Suomi', flag: '🇫🇮' },
  { code: 'cs', label: 'Czech', native: 'Čeština', flag: '🇨🇿' },
  { code: 'hu', label: 'Hungarian', native: 'Magyar', flag: '🇭🇺' },
  { code: 'he', label: 'Hebrew', native: 'עברית', flag: '🇮🇱', rtl: true },
  { code: 'sw', label: 'Swahili', native: 'Kiswahili', flag: '🇰🇪' },
  { code: 'ha', label: 'Hausa', native: 'Hausa', flag: '🇳🇬' },
  { code: 'tl', label: 'Filipino', native: 'Filipino', flag: '🇵🇭' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', flag: '🇮🇳' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'az', label: 'Azerbaijani', native: 'Azərbaycan', flag: '🇦🇿' },
  { code: 'kk', label: 'Kazakh', native: 'Қазақ', flag: '🇰🇿' },
  { code: 'uz', label: 'Uzbek', native: 'Oʻzbek', flag: '🇺🇿' },
  { code: 'af', label: 'Afrikaans', native: 'Afrikaans', flag: '🇿🇦' },
  { code: 'sq', label: 'Albanian', native: 'Shqip', flag: '🇦🇱' },
  { code: 'hr', label: 'Croatian', native: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sr', label: 'Serbian', native: 'Српски', flag: '🇷🇸' },
  { code: 'bg', label: 'Bulgarian', native: 'Български', flag: '🇧🇬' },
  { code: 'sk', label: 'Slovak', native: 'Slovenčina', flag: '🇸🇰' },
];

export function getLanguage(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}
