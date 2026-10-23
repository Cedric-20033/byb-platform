'use server';

// src/app/actions/password.ts
import { createClient } from '@/infrastructure/supabase/server';
import { authRateLimiter } from '@/infrastructure/ratelimit/InMemoryRateLimiter';
import { getClientIp } from '@/infrastructure/http/getClientIp';
import type { RateLimitPolicy } from '@/domain/shared/RateLimiter';
import { getCurrentAdmin, toActorRole } from '@/lib/auth/getCurrentAdmin';
import { recordAuthEvent } from '@/lib/auth/recordAuthEvent';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';
import {
  changePasswordSchema,
  requestPasswordResetSchema,
  setPasswordSchema,
} from '@/lib/validation/password';

type PasswordResult = { success: true } | ActionFailure;

const RESET_REQUEST_POLICY: RateLimitPolicy = { maxAttempts: 3, windowMs: 15 * 60_000 };
const CHANGE_PASSWORD_POLICY: RateLimitPolicy = { maxAttempts: 5, windowMs: 15 * 60_000 };

/**
 * Envoie le lien de réinitialisation.
 *
 * Répond « succès » que le compte existe ou non : renvoyer une erreur pour une
 * adresse inconnue permettrait de tester quelles adresses ont un compte admin.
 * Seul le dépassement de quota, qui ne dépend pas de l'existence du compte, est signalé.
 */
export async function requestPasswordResetAction(input: unknown): Promise<PasswordResult> {
  try {
    const parsed = requestPasswordResetSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const email = parsed.data.email.toLowerCase();
    const throttleKey = `password-reset:${email}|${(await getClientIp()) ?? 'unknown'}`;

    const decision = await authRateLimiter.check(throttleKey, RESET_REQUEST_POLICY);
    if (!decision.allowed) return failure('TOO_MANY_ATTEMPTS');
    await authRateLimiter.record(throttleKey, RESET_REQUEST_POLICY);

    // `purpose` (et non une URL libre) décide de la page d'arrivée : voir la route /auth/callback.
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/${parsed.data.locale}/auth/callback?purpose=reset`;

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    // 429 = limite d'envoi d'emails de Supabase : indépendante de l'existence du compte.
    if (error?.status === 429) return failure('TOO_MANY_ATTEMPTS');
    if (error?.status && error.status >= 500) return failure('UNKNOWN');

    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

/**
 * Définit le mot de passe après un lien d'invitation ou de réinitialisation.
 * La session a été ouverte par la route /auth/callback ; sans elle, `getCurrentAdmin`
 * refuse l'opération. Les autres appareils sont déconnectés : si le lien servait à
 * récupérer un compte compromis, l'ancienne session de l'intrus ne survit pas.
 */
export async function setPasswordAction(input: unknown): Promise<PasswordResult> {
  try {
    const parsed = setPasswordSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      return failure(error.code === 'weak_password' ? 'VALIDATION_FAILED' : 'UNKNOWN');
    }

    await supabase.auth.signOut({ scope: 'others' });
    await recordAuthEvent({
      event: 'password_changed',
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
      metadata: { via: 'link' },
    });
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

/**
 * Changement de mot de passe depuis « Mon compte ». Le mot de passe actuel est
 * revérifié : une session volée (poste laissé ouvert) ne suffit pas à prendre le compte.
 */
export async function changePasswordAction(input: unknown): Promise<PasswordResult> {
  try {
    const parsed = changePasswordSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    const throttleKey = `change-password:${admin.id}`;

    const decision = await authRateLimiter.check(throttleKey, CHANGE_PASSWORD_POLICY);
    if (!decision.allowed) return failure('TOO_MANY_ATTEMPTS');

    const supabase = await createClient();
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: admin.email,
      password: parsed.data.currentPassword,
    });
    if (verifyError) {
      if (verifyError.status && verifyError.status >= 500) return failure('UNKNOWN');
      await authRateLimiter.record(throttleKey, CHANGE_PASSWORD_POLICY);
      return failure('INVALID_CURRENT_PASSWORD');
    }

    const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
    if (error) {
      return failure(error.code === 'weak_password' ? 'VALIDATION_FAILED' : 'UNKNOWN');
    }

    await supabase.auth.signOut({ scope: 'others' });
    await authRateLimiter.reset(throttleKey);
    await recordAuthEvent({
      event: 'password_changed',
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
      metadata: { via: 'account' },
    });
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
