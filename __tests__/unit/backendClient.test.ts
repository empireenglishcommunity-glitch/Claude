/**
 * Unit lane — fast, isolated example-based tests.
 *
 * Task 1.1 smoke test: verifies the Foundation backend client's pure config
 * reader. Feature-specific unit tests are added in later tasks.
 */
import {
  BackendConfigError,
  ENV_KEYS,
  readBackendConfig,
} from '../../src/foundation/backendClient';

describe('readBackendConfig', () => {
  const validEnv = {
    [ENV_KEYS.url]: 'https://example.supabase.co',
    [ENV_KEYS.anonKey]: 'anon-public-key',
  };

  it('returns the trimmed url and anon key when both are present', () => {
    const config = readBackendConfig({
      [ENV_KEYS.url]: '  https://example.supabase.co  ',
      [ENV_KEYS.anonKey]: '  anon-public-key  ',
    });
    expect(config).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'anon-public-key',
    });
  });

  it('throws BackendConfigError when the url is missing', () => {
    expect(() =>
      readBackendConfig({ [ENV_KEYS.anonKey]: 'anon-public-key' }),
    ).toThrow(BackendConfigError);
  });

  it('throws BackendConfigError when the anon key is blank', () => {
    expect(() =>
      readBackendConfig({ ...validEnv, [ENV_KEYS.anonKey]: '   ' }),
    ).toThrow(BackendConfigError);
  });
});
