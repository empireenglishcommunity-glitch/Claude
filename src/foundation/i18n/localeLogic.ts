/**
 * i18n PURE logic — locale resolution, direction decision, string lookup
 * with `en` fallback (Task 10.1).
 *
 * Every decision the Arabic-first interface needs is expressed here as a pure,
 * side-effect-free function so it runs fully offline and deterministically in
 * unit tests (Task 10.5). The RN/i18next side-effects (forcing RTL, mounting
 * i18next) live behind the injectable adapter in `localeController.ts`; this
 * module never imports `react-native`, `i18next`, or `expo-localization`.
 *
 * Design §7.1 / Requirements 2.1, 2.2, 2.5, 2.6, 2.7.
 */
import type { UiLocale } from '../types';
import { LOCALE_RESOURCES, type LocaleResources } from './resources';

/** Layout direction the interface renders in. */
export type LayoutDirection = 'rtl' | 'ltr';

/** The interface locales the foundation supports. */
export const SUPPORTED_LOCALES: readonly UiLocale[] = ['ar', 'en'];

/**
 * The default interface locale for a newly created learner: Arabic (Req 2.1).
 * The English toggle becomes the default as learners climb, driven by
 * `LearnerProfile.uiLocale` (design §7.1) — this constant is only the seed.
 */
export const DEFAULT_UI_LOCALE: UiLocale = 'ar';

/** The fallback locale used for any string missing from the active bundle (Req 2.6). */
export const FALLBACK_UI_LOCALE: UiLocale = 'en';

/** True iff `value` is a supported {@link UiLocale}. */
export function isSupportedLocale(value: unknown): value is UiLocale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Whether a locale renders right-to-left. Arabic is RTL; English is LTR
 * (Req 2.2). Used to decide `I18nManager.forceRTL` at the adapter boundary.
 */
export function isRtlLocale(locale: UiLocale): boolean {
  return locale === 'ar';
}

/** The layout direction for a locale (Req 2.2). */
export function resolveDirection(locale: UiLocale): LayoutDirection {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}

/**
 * Resolve the initial interface locale from a candidate (e.g. a persisted
 * profile value or a device locale). Any unsupported / missing candidate
 * defaults to Arabic (Req 2.1).
 */
export function resolveInitialLocale(candidate?: unknown): UiLocale {
  return isSupportedLocale(candidate) ? candidate : DEFAULT_UI_LOCALE;
}

/**
 * Look up an interface string for `key` in `locale`, falling back to the `en`
 * bundle when the key is missing from the active bundle (Req 2.6). When the key
 * is absent from BOTH bundles the key itself is returned, so a missing string is
 * always visible (never an empty render) and easy to spot in development.
 *
 * Pure: depends only on its arguments and the provided `resources`.
 */
export function translate(
  locale: UiLocale,
  key: string,
  resources: LocaleResources = LOCALE_RESOURCES,
): string {
  const active = resources[locale];
  if (active && Object.prototype.hasOwnProperty.call(active, key)) {
    return active[key];
  }
  const fallback = resources[FALLBACK_UI_LOCALE];
  if (fallback && Object.prototype.hasOwnProperty.call(fallback, key)) {
    return fallback[key];
  }
  return key;
}

/**
 * Whether a string for `key` exists in `locale`'s OWN bundle (no fallback).
 * Useful for diagnostics/tests that assert the fallback path is taken.
 */
export function hasOwnString(
  locale: UiLocale,
  key: string,
  resources: LocaleResources = LOCALE_RESOURCES,
): boolean {
  const bundle = resources[locale];
  return !!bundle && Object.prototype.hasOwnProperty.call(bundle, key);
}
