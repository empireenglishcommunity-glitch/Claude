/**
 * i18n resource bundles — Arabic-first foundation UI strings (Task 10.1).
 *
 * Seed set of the FOUNDATION interface strings (auth, settings, audio capture,
 * outbox, common chrome, error indications). These cover only the P1 app-shell /
 * foundation surfaces — feature copy (placement, drills, daily loop, etc.) is
 * owned by P2–P8 and is intentionally NOT here.
 *
 * ── Design references ───────────────────────────────────────────────────────
 *   • §7.1 Arabic-First Interface — all UI strings live in `ar`/`en` bundles;
 *     `ar` is the default; **learning content stays English** regardless of the
 *     interface locale (only the chrome is localized).
 *   • Requirements 2.1 (default `ar`), 2.5 (all strings from `ar`/`en` bundles),
 *     2.6 (missing string → fall back to `en`), 2.7 (content stays English).
 *
 * ── Shape ───────────────────────────────────────────────────────────────────
 * A flat dot-namespaced key→string map per locale. The `ar` bundle is allowed to
 * be a PARTIAL of the `en` bundle: any key it omits falls back to `en` at lookup
 * time (Req 2.6), which is exactly the behaviour the unit test in Task 10.5
 * pins down. `en` is therefore the canonical/complete bundle.
 *
 * This module is PURE DATA (no runtime logic, no RN/i18next imports), so it is
 * safe to import in offline unit/property tests and on both the RN and Deno
 * toolchains.
 */
import type { UiLocale } from '../types';

/** A flat key→string localization table for one locale. */
export type LocaleBundle = Record<string, string>;

/** The full set of localization bundles, keyed by {@link UiLocale}. */
export type LocaleResources = Record<UiLocale, LocaleBundle>;

/**
 * Canonical English bundle — the COMPLETE key set. Every interface string the
 * foundation shell needs has an entry here, so `en` can always satisfy a lookup
 * (the fallback target, Req 2.6).
 */
export const EN_BUNDLE: LocaleBundle = Object.freeze({
  // common chrome
  'common.appName': 'Empire English',
  'common.continue': 'Continue',
  'common.cancel': 'Cancel',
  'common.retry': 'Retry',
  'common.dismiss': 'Dismiss',
  'common.loading': 'Loading…',
  'common.save': 'Save',
  'common.error': 'Something went wrong',
  // authentication
  'auth.signIn': 'Sign in',
  'auth.signUp': 'Create account',
  'auth.signOut': 'Sign out',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.welcome': 'Welcome to Empire English',
  // settings
  'settings.title': 'Settings',
  'settings.language': 'Interface language',
  'settings.language.arabic': 'العربية',
  'settings.language.english': 'English',
  // audio capture
  'audio.record.start': 'Start recording',
  'audio.record.stop': 'Stop recording',
  'audio.record.inProgress': 'Recording…',
  'audio.record.savedLocally': 'Saved on your device',
  // outbox / connectivity
  'outbox.pending': 'Waiting to sync',
  'outbox.evaluated': 'Evaluated',
  'outbox.failed': 'Upload failed',
  'outbox.retry': 'Try again',
  'outbox.offline': 'You are offline — your work is saved',
  'outbox.lowData': 'Low-data mode is on',
  // error indications
  'error.localePersistFailed': 'Could not change the language. Please try again.',
  'error.uploadFailed': 'Upload did not complete. It will retry automatically.',
  'error.localPersistFailed': 'Could not save your recording on this device.',
});

/**
 * Arabic bundle (RTL, the DEFAULT interface locale — Req 2.1). Intentionally a
 * partial of {@link EN_BUNDLE}: a few rarely-surfaced keys are deliberately left
 * untranslated so the `en` fallback (Req 2.6) is exercised in production and in
 * the Task 10.5 unit test. Note these are INTERFACE strings only; lesson/audio
 * CONTENT stays English everywhere (Req 2.7), so it never appears in any bundle.
 */
export const AR_BUNDLE: LocaleBundle = Object.freeze({
  // common chrome
  'common.appName': 'إمباير إنجلِش',
  'common.continue': 'متابعة',
  'common.cancel': 'إلغاء',
  'common.retry': 'إعادة المحاولة',
  'common.dismiss': 'تجاهل',
  'common.loading': 'جارٍ التحميل…',
  'common.save': 'حفظ',
  'common.error': 'حدث خطأ ما',
  // authentication
  'auth.signIn': 'تسجيل الدخول',
  'auth.signUp': 'إنشاء حساب',
  'auth.signOut': 'تسجيل الخروج',
  'auth.email': 'البريد الإلكتروني',
  'auth.password': 'كلمة المرور',
  'auth.welcome': 'مرحبًا بك في إمباير إنجلِش',
  // settings
  'settings.title': 'الإعدادات',
  'settings.language': 'لغة الواجهة',
  'settings.language.arabic': 'العربية',
  'settings.language.english': 'English',
  // audio capture
  'audio.record.start': 'ابدأ التسجيل',
  'audio.record.stop': 'إيقاف التسجيل',
  'audio.record.inProgress': 'جارٍ التسجيل…',
  // NOTE: 'audio.record.savedLocally' intentionally omitted → falls back to en.
  // outbox / connectivity
  'outbox.pending': 'في انتظار المزامنة',
  'outbox.evaluated': 'تم التقييم',
  'outbox.failed': 'فشل الرفع',
  'outbox.retry': 'حاول مرة أخرى',
  'outbox.offline': 'أنت غير متصل — تم حفظ عملك',
  'outbox.lowData': 'وضع توفير البيانات مُفعّل',
  // error indications
  'error.localePersistFailed': 'تعذّر تغيير اللغة. حاول مرة أخرى.',
  // NOTE: 'error.uploadFailed' and 'error.localPersistFailed' intentionally
  // omitted → fall back to en (Req 2.6).
});

/** The default resource set consumed by the locale controller. */
export const LOCALE_RESOURCES: LocaleResources = Object.freeze({
  ar: AR_BUNDLE,
  en: EN_BUNDLE,
});
