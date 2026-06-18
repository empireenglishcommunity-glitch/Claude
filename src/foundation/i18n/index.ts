/**
 * Arabic-first i18n module — public surface (Task 10.1).
 *
 * Re-exports the pure logic, resource bundles, and the locale controller. The
 * RN/i18next runtime adapter (`runtimeAdapter.ts`) is intentionally NOT exported
 * here — it is reached only via `createLocaleController`, which lazy-imports it,
 * so importing this barrel never drags `react-native`/`i18next` into an offline
 * test's import graph.
 *
 * Design §7.1 / Requirements 2.1–2.7.
 */
export * from './resources';
export * from './localeLogic';
export {
  LocaleController,
  LocalePersistError,
  createLocaleController,
  DEFAULT_UI_LOCALE,
  type LocalePersistPort,
  type DirectionPort,
  type SetLocaleResult,
  type LocaleControllerOptions,
} from './localeController';
