/**
 * Foundation backend client (Layer 0 entry point).
 *
 * This is the SINGLE typed entry point to the managed Supabase backend
 * (Postgres + Auth + Storage + Realtime). Every later Foundation SDK module
 * — AuthApi, ProfileApi, AudioApi, AiApi — wraps this client rather than
 * importing `@supabase/supabase-js` or talking to any external service
 * directly (design §1 boundary note, Requirements 1.2/1.3).
 *
 * Configuration is read from the environment at runtime. Only the PUBLIC
 * Supabase URL and anon key are used here; they are safe to ship in the app
 * bundle because Row-Level Security enforces per-learner isolation. The
 * service-role key and all AI provider keys live ONLY in Edge Function
 * secrets and are never imported by the app (Requirement 1.5).
 *
 * NOTE: This module deliberately contains no domain/feature logic — that
 * arrives in later tasks (typed `Database` generics in Task 2.1, the SDK
 * wrappers in Tasks 3–10). Task 1.1 only establishes the wiring.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Public, client-safe backend configuration. */
export interface BackendConfig {
  /** Supabase project URL, e.g. https://xyz.supabase.co */
  url: string;
  /** Supabase anonymous (public) key — RLS-protected, safe to ship. */
  anonKey: string;
}

/** Raised when required public backend configuration is missing/blank. */
export class BackendConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackendConfigError';
  }
}

/**
 * The Expo public environment variable names. Expo inlines variables prefixed
 * with `EXPO_PUBLIC_` into the client bundle at build time.
 */
export const ENV_KEYS = {
  url: 'EXPO_PUBLIC_SUPABASE_URL',
  anonKey: 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
} as const;

/**
 * Read and validate the public backend configuration from an environment map.
 *
 * Pure and side-effect free (no client creation) so it is trivially testable.
 * Throws {@link BackendConfigError} when a required value is missing or blank.
 */
export function readBackendConfig(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): BackendConfig {
  const url = env[ENV_KEYS.url]?.trim();
  const anonKey = env[ENV_KEYS.anonKey]?.trim();

  if (!url) {
    throw new BackendConfigError(
      `Missing ${ENV_KEYS.url}. Copy .env.example to .env and set your Supabase project URL.`,
    );
  }
  if (!anonKey) {
    throw new BackendConfigError(
      `Missing ${ENV_KEYS.anonKey}. Copy .env.example to .env and set your Supabase anon key.`,
    );
  }

  return { url, anonKey };
}

// Lazily-created singleton so the whole app shares one realtime/auth session.
let cachedClient: SupabaseClient | null = null;

/**
 * Get the shared, lazily-initialized Supabase client.
 *
 * The client is created on first use from validated env config. Auth is
 * configured to persist and auto-refresh the learner session; URL-based
 * session detection is disabled because this is a native/mobile-first app
 * (deep-link claim handling is implemented in a later task).
 */
export function getBackendClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const { url, anonKey } = readBackendConfig();
  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return cachedClient;
}

/**
 * Reset the cached client. Intended for tests and for re-initialization after
 * a configuration change; not used in normal app flow.
 */
export function resetBackendClient(): void {
  cachedClient = null;
}

export type { SupabaseClient };
