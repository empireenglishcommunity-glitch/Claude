/**
 * Supabase-backed implementation of the {@link AuthPort} (Project P1, Task 4.1).
 *
 * Wraps `supabase.auth` (via the shared Foundation backend client) and maps its
 * native results/errors onto the SDK's normalized {@link AuthSession} and typed
 * errors. This is the ONLY module that knows the Supabase auth surface; the
 * `AuthApi` SDK depends solely on the {@link AuthPort} interface, so swapping the
 * auth provider is a single-adapter change (design §1 boundary note).
 *
 * Error mapping:
 *   • bad sign-in credentials               → {@link InvalidCredentialsError} (Req 5.6)
 *   • already-registered sign-up email      → {@link DuplicateAccountError}   (Req 5.7)
 *
 * Duplicate-email detection is defensive against both Supabase configurations:
 *   1. confirmations OFF → `signUp` returns an error (`user_already_exists` /
 *      "User already registered").
 *   2. confirmations ON  → `signUp` succeeds but returns a user with an EMPTY
 *      `identities` array (Supabase obfuscates existing accounts); we treat that
 *      as a duplicate so no second profile is ever bootstrapped.
 */
import type { Session } from '@supabase/supabase-js';
import type { SupabaseClient } from '../backendClient';
import { getBackendClient } from '../backendClient';
import { AuthError, type AuthSession } from './sessionGuard';
import {
  DuplicateAccountError,
  InvalidCredentialsError,
  type AuthPort,
  type SignUpOutcome,
} from './authApi';

/** Map a Supabase {@link Session} onto the normalized {@link AuthSession}. */
function mapSession(session: Session): AuthSession {
  const expiresIn = typeof session.expires_in === 'number' ? session.expires_in : 0;
  // Supabase `expires_at` is Unix epoch SECONDS; fall back to now+expires_in.
  const expiresAt =
    typeof session.expires_at === 'number'
      ? session.expires_at
      : Math.floor(Date.now() / 1000) + expiresIn;
  // `issued_at` is not exposed directly; derive it from expiry minus lifetime.
  const issuedAt = expiresAt - expiresIn;
  return {
    userId: session.user.id,
    accessToken: session.access_token,
    expiresAt,
    issuedAt,
  };
}

/** Heuristic: does this Supabase auth error indicate an already-registered email? */
function isDuplicateEmailError(error: { message?: string; code?: string; status?: number }): boolean {
  const code = (error.code ?? '').toLowerCase();
  const message = (error.message ?? '').toLowerCase();
  return (
    code === 'user_already_exists' ||
    code === 'email_exists' ||
    message.includes('already registered') ||
    message.includes('already exists')
  );
}

/** Heuristic: does this Supabase auth error indicate invalid login credentials? */
function isInvalidCredentialError(error: { message?: string; code?: string; status?: number }): boolean {
  const code = (error.code ?? '').toLowerCase();
  const message = (error.message ?? '').toLowerCase();
  return (
    code === 'invalid_credentials' ||
    code === 'otp_expired' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid') ||
    message.includes('expired') ||
    error.status === 400
  );
}

export class SupabaseAuthPort implements AuthPort {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient = getBackendClient()) {
    this.client = client;
  }

  async signUpWithPassword(email: string, password: string): Promise<SignUpOutcome> {
    const { data, error } = await this.client.auth.signUp({ email, password });
    if (error) {
      if (isDuplicateEmailError(error)) throw new DuplicateAccountError(email);
      throw new AuthError(`Sign-up failed: ${error.message}`);
    }
    if (!data.user) {
      throw new AuthError('Sign-up failed: no user returned.');
    }
    // Confirmations ON: an existing email is obfuscated as a user with no identities.
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new DuplicateAccountError(email);
    }
    return {
      userId: data.user.id,
      session: data.session ? mapSession(data.session) : null,
    };
  }

  async signInWithPassword(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) {
      if (isInvalidCredentialError(error)) throw new InvalidCredentialsError();
      throw new AuthError(`Sign-in failed: ${error.message}`);
    }
    if (!data.session) {
      // No session on a "successful" sign-in means the credentials did not yield one.
      throw new InvalidCredentialsError();
    }
    return mapSession(data.session);
  }

  async requestEmailOtp(email: string, createUser: boolean): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: createUser },
    });
    if (error) {
      throw new AuthError(`Failed to send one-time passcode: ${error.message}`);
    }
  }

  async verifyEmailOtp(email: string, token: string): Promise<AuthSession> {
    const { data, error } = await this.client.auth.verifyOtp({ email, token, type: 'email' });
    if (error) {
      if (isInvalidCredentialError(error)) throw new InvalidCredentialsError('Invalid or expired one-time passcode.');
      throw new AuthError(`OTP verification failed: ${error.message}`);
    }
    if (!data.session) {
      throw new InvalidCredentialsError('Invalid or expired one-time passcode.');
    }
    return mapSession(data.session);
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      throw new AuthError(`Sign-out failed: ${error.message}`);
    }
  }

  async getSession(): Promise<AuthSession | null> {
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      throw new AuthError(`Failed to read session: ${error.message}`);
    }
    return data.session ? mapSession(data.session) : null;
  }
}
