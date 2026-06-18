/**
 * Unit lane — Arabic-first i18n (Task 10.5).
 *
 * Covers the missing-string `en` fallback (Req 2.6) and the locale-persist
 * -failure rollback + error indication (Req 2.4). Runs fully offline against the
 * pure logic + in-memory port fakes — never touches `react-native`/`i18next`.
 *
 * _Requirements: 2.4, 2.6_
 */
import {
  DEFAULT_UI_LOCALE,
  FALLBACK_UI_LOCALE,
  hasOwnString,
  isRtlLocale,
  resolveDirection,
  resolveInitialLocale,
  translate,
} from '../../src/foundation/i18n/localeLogic';
import { AR_BUNDLE, EN_BUNDLE } from '../../src/foundation/i18n/resources';
import {
  LocaleController,
  LocalePersistError,
  type DirectionPort,
  type LocalePersistPort,
} from '../../src/foundation/i18n/localeController';
import type { LayoutDirection } from '../../src/foundation/i18n/localeLogic';
import type { UiLocale } from '../../src/foundation/types';

// ── Test doubles ─────────────────────────────────────────────────────────────

class RecordingDirectionPort implements DirectionPort {
  readonly applied: Array<{ direction: LayoutDirection; locale: UiLocale }> = [];
  apply(direction: LayoutDirection, locale: UiLocale): void {
    this.applied.push({ direction, locale });
  }
  get last(): { direction: LayoutDirection; locale: UiLocale } | undefined {
    return this.applied[this.applied.length - 1];
  }
}

class InMemoryLocalePersister implements LocalePersistPort {
  saved: UiLocale | null = null;
  async persist(locale: UiLocale): Promise<void> {
    this.saved = locale;
  }
}

class FailingLocalePersister implements LocalePersistPort {
  async persist(_locale: UiLocale): Promise<void> {
    throw new Error('network down');
  }
}

// ── Locale logic defaults / direction ────────────────────────────────────────

describe('locale logic (Req 2.1, 2.2)', () => {
  it('defaults a new learner to Arabic', () => {
    expect(DEFAULT_UI_LOCALE).toBe('ar');
    expect(resolveInitialLocale(undefined)).toBe('ar');
    expect(resolveInitialLocale('fr')).toBe('ar'); // unsupported → default
    expect(resolveInitialLocale('en')).toBe('en'); // supported respected
  });

  it('maps Arabic to RTL and English to LTR', () => {
    expect(isRtlLocale('ar')).toBe(true);
    expect(isRtlLocale('en')).toBe(false);
    expect(resolveDirection('ar')).toBe('rtl');
    expect(resolveDirection('en')).toBe('ltr');
  });
});

// ── Missing-string en fallback (Req 2.6) ─────────────────────────────────────

describe('missing-string fallback to en (Req 2.6)', () => {
  it('falls back to the en bundle for a key missing from ar', () => {
    // This key is intentionally absent from AR_BUNDLE.
    expect(hasOwnString('ar', 'audio.record.savedLocally')).toBe(false);
    expect(hasOwnString('en', 'audio.record.savedLocally')).toBe(true);
    expect(translate('ar', 'audio.record.savedLocally')).toBe(
      EN_BUNDLE['audio.record.savedLocally'],
    );
  });

  it('uses the ar string when present (no fallback)', () => {
    expect(translate('ar', 'auth.signIn')).toBe(AR_BUNDLE['auth.signIn']);
    expect(translate('ar', 'auth.signIn')).not.toBe(EN_BUNDLE['auth.signIn']);
  });

  it('returns the key itself when absent from both bundles', () => {
    expect(translate('ar', 'totally.unknown.key')).toBe('totally.unknown.key');
  });

  it('FALLBACK_UI_LOCALE is en and the en bundle is the complete superset', () => {
    expect(FALLBACK_UI_LOCALE).toBe('en');
    for (const key of Object.keys(AR_BUNDLE)) {
      expect(Object.prototype.hasOwnProperty.call(EN_BUNDLE, key)).toBe(true);
    }
  });
});

// ── Locale switching + persist-failure rollback (Req 2.3, 2.4) ───────────────

describe('LocaleController.setLocale (Req 2.3, 2.4)', () => {
  it('persists and applies the new direction on success', async () => {
    const persister = new InMemoryLocalePersister();
    const director = new RecordingDirectionPort();
    const controller = new LocaleController(persister, director); // defaults to ar

    expect(controller.getLocale()).toBe('ar');
    const result = await controller.setLocale('en');

    expect(result.ok).toBe(true);
    expect(controller.getLocale()).toBe('en');
    expect(controller.getDirection()).toBe('ltr');
    expect(persister.saved).toBe('en');
    expect(director.last).toEqual({ direction: 'ltr', locale: 'en' });
  });

  it('rolls back to the prior locale + direction and surfaces an error on persist failure', async () => {
    const director = new RecordingDirectionPort();
    const controller = new LocaleController(new FailingLocalePersister(), director, {
      initialLocale: 'ar',
    });

    const result = await controller.setLocale('en');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.locale).toBe('ar'); // retained
      expect(result.direction).toBe('rtl'); // retained
      expect(result.errorKey).toBe('error.localePersistFailed');
      expect(result.error).toBeInstanceOf(LocalePersistError);
    }
    // State unchanged after a failed switch (Req 2.4).
    expect(controller.getLocale()).toBe('ar');
    expect(controller.getDirection()).toBe('rtl');
    // The new (failed) direction was NEVER applied.
    expect(director.applied.find((a) => a.locale === 'en')).toBeUndefined();
  });

  it('t() resolves through the active locale with en fallback', async () => {
    const controller = new LocaleController(new InMemoryLocalePersister(), new RecordingDirectionPort(), {
      initialLocale: 'ar',
    });
    expect(controller.t('auth.signIn')).toBe(AR_BUNDLE['auth.signIn']);
    // Missing in ar → en fallback.
    expect(controller.t('audio.record.savedLocally')).toBe(EN_BUNDLE['audio.record.savedLocally']);
  });
});
