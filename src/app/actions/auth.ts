'use server';

// src/app/actions/auth.ts
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseAdminRepository } from '@/infrastructure/supabase/repositories/SupabaseAdminRepository';
import { authRateLimiter } from '@/infrastructure/ratelimit/InMemoryRateLimiter';
import { getClientIp } from '@/infrastructure/http/getClientIp';
import type { RateLimitPolicy } from '@/domain/shared/RateLimiter';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

type SignInResult = { success: true } | ActionFailure;

/** 5 échecs par couple email + IP et par quart d'heure : freine la force brute sans gêner une faute de frappe. */
const SIGN_IN_POLICY: RateLimitPolicy = { maxAttempts: 5, windowMs: 15 * 60_000 };

/**
 * Connexion admin.
 *
 * Ne s'arrête pas à l'authentification Supabase : un compte désactivé garde des
 * identifiants valides, il est donc refusé ici explicitement (et déconnecté),
 * avant même d'atteindre le layout du dashboard.
 */
export async function signInAction(input: unknown): Promise<SignInResult> {
  try {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) {
      return failure('VALIDATION_FAILED');
    }

    // Email normalisé pour que « Ada@byb.be » et « ada@byb.be » partagent le même quota.
    const email = parsed.data.email.toLowerCase();
    const throttleKey = `sign-in:${email}|${(await getClientIp()) ?? 'unknown'}`;

    const decision = await authRateLimiter.check(throttleKey, SIGN_IN_POLICY);
    if (!decision.allowed) {
      return failure('TOO_MANY_ATTEMPTS');
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });

    if (error || !data.user) {
      // Une panne du service d'authentification (5xx) n'est pas un mauvais mot de passe :
      // elle ne consomme pas de tentative et ne doit pas être présentée comme telle.
      if (error?.status && error.status >= 500) return failure('UNKNOWN');
      await authRateLimiter.record(throttleKey, SIGN_IN_POLICY);
      return failure('INVALID_CREDENTIALS');
    }

    const profile = await new SupabaseAdminRepository(supabase).findById(data.user.id);

    if (!profile || !profile.isActive) {
      await supabase.auth.signOut();
      return failure(profile ? 'ACCOUNT_DISABLED' : 'FORBIDDEN');
    }

    await authRateLimiter.reset(throttleKey);
    return { success: true };
  } catch (error) {
    // Ici une erreur inattendue (réseau, Supabase indisponible...), distincte
    // d'un simple mauvais mot de passe (déjà géré ci-dessus sans exception).
    return failure(toErrorCode(error));
  }
}

export async function signOutAction(locale: Locale): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(getLocalizedPath('/login', locale));
}
