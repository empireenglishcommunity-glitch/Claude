/**
 * Locale controller — orchestrates the Arabic-first interface (Task 10.1).
 *
 * Ties the pure logic (`localeLogic.ts`) to two small INJECTABLE side-effect
 * ports so the orchestration is fully offline-testable:
 *
 *   • {@link LocalePersistPort}  — persists the chosen `uiLocale` to the Learner
 *     Profile (production wires this to a profile update via `ProfileApi`; tests
 *     inject a fake, including a FAILING fake for the rollback test).
 *   • {@link DirectionPort}      — applies the layout direction (production wraps
 *     React Native's `I18nManager.forceRTL` + i18next; tests inject a recorder).
 *
 * The controller implements the §7.1 / Requirement-2 behaviour:
 *   • starts at Arabic by default (Req 2.1) unless seeded otherwise;
 *   • on `setLocale`, persists FIRST, then applies the matching direction — so a
 *     persistence failure leaves BOTH the locale and the direction unchanged and
 *     surfaces an error indication (Req 2.3, 2.4);
 *   • exposes `t(key)` which resolves strings with the `en` fallback (Req 2.6);
 *   • holds only INTERFACE strings — lesson/audio content stays English (Req 2.7).
 *
 * The "apply within 1 second" timing (Req 2.3) is met by applying the direction
 * synchronously immediately after a successful persist (no deferred work).
 */
import type { UiLocale } from '../types';
import { LOCALE_RESOURCES, type LocaleResources } from './resources';
import {
  DEFAULT_UI_LOCALE,
  resolveDirection,
  resolveInitialLocale,
  translate,
  type LayoutDirection,
} from './localeLogic';

// ═══════════════════════════════════════════════════════════════════════════
// Injectable side-effect ports
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Persists the selected interface locale to the Learner Profile (Req 2.3).
 * Production implementation updates `LearnerProfile.uiLocale` through the
 * Foundation SDK; tests inject an in-memory (or deliberately failing) fake.
 * Implementations SHOULD reject (throw) when the write cannot be confirmed.
 */
export interface LocalePersistPort {
  persist(locale: UiLocale): Promise<void>;
}

/**
 * Applies the layout direction to the running UI (Req 2.2). Production wraps
 * `I18nManager.forceRTL(...)` and switches the i18next language; tests inject a
 * recorder so the decision is asserted without RN. May be sync or async.
 */
export interface DirectionPort {
  apply(direction: LayoutDirection, locale: UiLocale): void | Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Typed error + result
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Raised internally when persisting the locale fails. The controller does NOT
 * leak this from `setLocale` (which returns a result object); it is exposed so
 * callers/tests can assert the cause carried on a failed result.
 */
export class LocalePersistError extends Error {
  constructor(public readonly cause: unknown) {
    super('Failed to persist the interface locale.');
    this.name = 'LocalePersistError';
  }
}

/** Outcome of a {@link LocaleController.setLocale} call. */
export type SetLocaleResult =
  | { ok: true; locale: UiLocale; direction: LayoutDirection }
  | {
      /** Persistence failed — locale + direction were rolled back / retained (Req 2.4). */
      ok: false;
      /** The locale still in effect (the prior one). */
      locale: UiLocale;
      direction: LayoutDirection;
      /** Localized error indication key the UI should surface. */
      errorKey: 'error.localePersistFailed';
      error: LocalePersistError;
    };

// ═══════════════════════════════════════════════════════════════════════════
// Controller
// ═══════════════════════════════════════════════════════════════════════════

export interface LocaleControllerOptions {
  /** Seed locale (e.g. from the persisted profile / device). Defaults to `ar`. */
  initialLocale?: unknown;
  /** Override the resource bundles (tests). Defaults to the shipped bundles. */
  resources?: LocaleResources;
}

/**
 * Holds the active interface locale and applies direction changes through the
 * injected ports. See the file header for the Requirement-2 behaviour it
 * realizes.
 */
export class LocaleController {
  private current: UiLocale;
  private direction: LayoutDirection;
  private readonly persister: LocalePersistPort;
  private readonly director: DirectionPort;
  private readonly resources: LocaleResources;

  constructor(
    persister: LocalePersistPort,
    director: DirectionPort,
    options: LocaleControllerOptions = {},
  ) {
    this.persister = persister;
    this.director = director;
    this.resources = options.resources ?? LOCALE_RESOURCES;
    this.current = resolveInitialLocale(options.initialLocale);
    this.direction = resolveDirection(this.current);
  }

  /** The active interface locale. */
  getLocale(): UiLocale {
    return this.current;
  }

  /** The active layout direction. */
  getDirection(): LayoutDirection {
    return this.direction;
  }

  /**
   * Apply the initial direction once at startup (so the first paint matches the
   * seeded locale). Idempotent; never persists. Returns the applied direction.
   */
  async applyInitialDirection(): Promise<LayoutDirection> {
    await this.director.apply(this.direction, this.current);
    return this.direction;
  }

  /**
   * Resolve an interface string in the active locale, falling back to `en`
   * (Req 2.6). Lesson/audio content is never routed through here (Req 2.7).
   */
  t(key: string): string {
    return translate(this.current, key, this.resources);
  }

  /**
   * Switch the interface locale (Req 2.3). Persists FIRST; only on a confirmed
   * persist does it update the in-memory locale and apply the new direction.
   * If persistence fails, the prior locale AND direction are retained and a
   * failure result carrying the `error.localePersistFailed` indication is
   * returned (Req 2.4) — the controller never throws for this path.
   */
  async setLocale(locale: UiLocale): Promise<SetLocaleResult> {
    if (locale === this.current) {
      // No-op switch: ensure the direction is in effect, no persistence needed.
      await this.director.apply(this.direction, this.current);
      return { ok: true, locale: this.current, direction: this.direction };
    }

    const priorLocale = this.current;
    const priorDirection = this.direction;

    try {
      await this.persister.persist(locale);
    } catch (cause) {
      // Rollback: retain the prior locale + direction; surface an indication.
      this.current = priorLocale;
      this.direction = priorDirection;
      return {
        ok: false,
        locale: priorLocale,
        direction: priorDirection,
        errorKey: 'error.localePersistFailed',
        error: new LocalePersistError(cause),
      };
    }

    // Persisted → commit and apply the new direction immediately (Req 2.3).
    this.current = locale;
    this.direction = resolveDirection(locale);
    await this.director.apply(this.direction, this.current);
    return { ok: true, locale: this.current, direction: this.direction };
  }
}

/** Default initial locale (re-exported for convenience). */
export { DEFAULT_UI_LOCALE };

/**
 * Construct the production locale controller wired to the RN/i18next runtime
 * adapter (which forces RTL via `I18nManager` and switches i18next) and a
 * profile-backed persister. Imported LAZILY so offline tests — which construct
 * `LocaleController` directly with fakes — never pull `react-native`, `i18next`,
 * or `expo-localization` into their import graph (mirrors `createProfileApi` /
 * `createAudioApi`).
 */
export async function createLocaleController(
  persister: LocalePersistPort,
  options: LocaleControllerOptions = {},
): Promise<LocaleController> {
  const { createRuntimeDirectionPort } = await import('./runtimeAdapter');
  const director = await createRuntimeDirectionPort(options.resources ?? LOCALE_RESOURCES);
  return new LocaleController(persister, director, options);
}
