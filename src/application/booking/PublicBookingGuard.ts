// src/application/booking/PublicBookingGuard.ts
import type { CaptchaVerifier } from '@/domain/shared/CaptchaVerifier';
import type { RateLimitPolicy, RateLimiter } from '@/domain/shared/RateLimiter';
import { assertSubmissionAllowed, consumeRateLimit, type SubmissionGuardOptions } from '@/application/shared/submissionGuard';

/**
 * Quotas des actions publiques de réservation. Volontairement généreux pour un humain (un foyer derrière
 * une même IP, quelques essais après une erreur de saisie) et prohibitifs pour un script.
 */
export const BOOKING_RATE_LIMITS = {
  createPerIp: { maxAttempts: 5, windowMs: 10 * 60_000 },
  createPerEmail: { maxAttempts: 3, windowMs: 60 * 60_000 },
  tokenPerIp: { maxAttempts: 30, windowMs: 10 * 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

export type PublicBookingGuardOptions = SubmissionGuardOptions;

/**
 * Protège les actions publiques de réservation (création, accès par jeton) contre l'abus : quotas par IP et
 * par email, vérification anti-robot. Les mécanismes (ordre des vérifications, tolérance aux pannes du
 * limiteur) sont communs à tous les formulaires publics : voir `submissionGuard`.
 */
export class PublicBookingGuard {
  constructor(
    private readonly limiter: RateLimiter,
    private readonly captcha: CaptchaVerifier,
    private readonly options: PublicBookingGuardOptions = {},
  ) {}

  async assertCanCreate(input: { ip: string | null; email: string; captchaToken: string | null }): Promise<void> {
    await assertSubmissionAllowed(
      {
        limiter: this.limiter,
        captcha: this.captcha,
        scope: 'booking:create',
        perIp: BOOKING_RATE_LIMITS.createPerIp,
        perEmail: BOOKING_RATE_LIMITS.createPerEmail,
        options: this.options,
      },
      input,
    );
  }

  /** Consultation, annulation ou déplacement via un jeton : frein au balayage de jetons. */
  async assertCanUseToken(input: { ip: string | null }): Promise<void> {
    await consumeRateLimit(
      this.limiter,
      `booking:token:ip:${input.ip ?? 'unknown'}`,
      BOOKING_RATE_LIMITS.tokenPerIp,
      this.options,
    );
  }
}
