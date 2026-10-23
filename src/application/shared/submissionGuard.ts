// src/application/shared/submissionGuard.ts
import type { CaptchaVerifier } from '@/domain/shared/CaptchaVerifier';
import { DomainError } from '@/domain/shared/DomainError';
import type { RateLimitPolicy, RateLimiter } from '@/domain/shared/RateLimiter';

export type SubmissionGuardOptions = {
  /** Reçoit les pannes du limiteur (base injoignable…) : elles ne bloquent pas le formulaire. */
  reportInfrastructureError?: (error: unknown) => void;
};

/**
 * Vérifie puis consomme une tentative : chaque appel compte, réussi ou non, c'est un quota d'abus.
 *
 * Choix de disponibilité : si le limiteur lui-même tombe en panne, la requête passe. Mieux vaut quelques
 * essais non comptés qu'un formulaire public hors service à cause d'un détail d'infrastructure.
 * Le refus, lui, est toujours explicite (`TOO_MANY_ATTEMPTS`).
 */
export async function consumeRateLimit(
  limiter: RateLimiter,
  key: string,
  policy: RateLimitPolicy,
  options: SubmissionGuardOptions = {},
): Promise<void> {
  try {
    const decision = await limiter.check(key, policy);
    if (!decision.allowed) {
      throw new DomainError('Trop de tentatives, réessayez plus tard.', 'TOO_MANY_ATTEMPTS');
    }
    await limiter.record(key, policy);
  } catch (error) {
    if (error instanceof DomainError) throw error;
    options.reportInfrastructureError?.(error);
  }
}

export type SubmissionGuardConfig = {
  limiter: RateLimiter;
  captcha: CaptchaVerifier;
  /** Préfixe des clés de quota : sépare les formulaires (« booking:create », « contact »). */
  scope: string;
  perIp: RateLimitPolicy;
  perEmail: RateLimitPolicy;
  options?: SubmissionGuardOptions;
};

/**
 * Protection commune des formulaires publics qui créent quelque chose : quota par IP, anti-robot, puis quota
 * par email.
 *
 * L'ordre est voulu : le quota IP protège d'abord le service anti-robot ; le quota email vient en dernier,
 * sans quoi un tiers pourrait épuiser, sans passer l'anti-robot, le quota d'une adresse qui n'est pas la sienne.
 */
export async function assertSubmissionAllowed(
  config: SubmissionGuardConfig,
  input: { ip: string | null; email: string; captchaToken: string | null },
): Promise<void> {
  const { limiter, captcha, scope, perIp, perEmail, options } = config;

  await consumeRateLimit(limiter, `${scope}:ip:${input.ip ?? 'unknown'}`, perIp, options);

  if (!(await captcha.verify(input.captchaToken, input.ip))) {
    throw new DomainError('Vérification anti-robot échouée.', 'CAPTCHA_FAILED');
  }

  await consumeRateLimit(limiter, `${scope}:email:${input.email.trim().toLowerCase()}`, perEmail, options);
}
