/**
 * i18n RUNTIME adapter — the thin RN/i18next side-effect boundary (Task 10.1).
 *
 * ⚠️ This is the ONLY i18n module that touches `react-native` (`I18nManager`),
 * `i18next`, and `react-i18next`. It is imported LAZILY (only by
 * `createLocaleController`) so the offline unit/property tests — which build a
 * `LocaleController` directly with in-memory fakes — never pull these RN/native
 * packages into their import graph. This keeps the logic-level tests fast and
 * deterministic (mirrors how `supabaseProfileStore` / `expoAvRecorder` are kept
 * out of the test graph).
 *
 * It exposes a {@link DirectionPort} that:
 *   • forces the React Native layout direction via `I18nManager.forceRTL(...)`
 *     using LOGICAL start/end semantics (Req 2.2), and
 *   • switches the i18next active language so string lookups follow the locale.
 *
 * The i18next instance is configured with `keySeparator: false` /
 * `nsSeparator: false` so our FLAT dot-namespaced keys (e.g. `auth.signIn`) are
 * treated literally, with `en` as the fallback language (Req 2.6).
 */
import { I18nManager } from 'react-native';
import i18next, { type i18n as I18nInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';
import type { UiLocale } from '../types';
import type { DirectionPort } from './localeController';
import { FALLBACK_UI_LOCALE, isRtlLocale, type LayoutDirection } from './localeLogic';
import { DEFAULT_UI_LOCALE } from './localeLogic';
import type { LocaleResources } from './resources';

/** The i18next default namespace our flat bundles are registered under. */
const NS = 'translation';

/** Build the i18next `resources` shape from our flat per-locale bundles. */
function toI18nextResources(resources: LocaleResources) {
  return {
    ar: { [NS]: resources.ar },
    en: { [NS]: resources.en },
  };
}

/**
 * Initialize (once) and return the shared i18next instance for the given
 * bundles. Safe to call repeatedly — re-initialization is skipped once ready.
 */
export async function initI18next(resources: LocaleResources): Promise<I18nInstance> {
  if (i18next.isInitialized) return i18next;
  await i18next.use(initReactI18next).init({
    resources: toI18nextResources(resources),
    lng: DEFAULT_UI_LOCALE,
    fallbackLng: FALLBACK_UI_LOCALE,
    defaultNS: NS,
    ns: [NS],
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return i18next;
}

/**
 * Construct the production {@link DirectionPort} backed by `I18nManager` +
 * i18next. Applying a direction forces the native RTL flag (so logical
 * start/end resolve correctly, Req 2.2) and switches the active i18next
 * language.
 */
export async function createRuntimeDirectionPort(
  resources: LocaleResources,
): Promise<DirectionPort> {
  const i18n = await initI18next(resources);
  return {
    async apply(direction: LayoutDirection, locale: UiLocale): Promise<void> {
      const wantRtl = isRtlLocale(locale) || direction === 'rtl';
      I18nManager.allowRTL(wantRtl);
      I18nManager.forceRTL(wantRtl);
      await i18n.changeLanguage(locale);
    },
  };
}
