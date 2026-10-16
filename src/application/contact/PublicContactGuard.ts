// src/application/contact/PublicContactGuard.ts
import type { CaptchaVerifier } from '@/domain/shared/CaptchaVerifier';
import type { RateLimitPolicy, RateLimiter } from '@/domain/shared/RateLimiter';
import { assertSubmissionAllowed, type SubmissionGuardOptions } from '@/application/shared/submissionGuard';

/**
 * Quotas du formulaire de contact. Plus serrés que ceux de la réservation : un humain écrit rarement plus
 * d'un ou deux messages à la suite, alors qu'un robot de démarchage en envoie des centaines.
 */
export const CONTACT_RATE_LIMITS = {
  perIp: { maxAttempts: 3, windowMs: 10 * 60_000 },
  perEmail: { maxAttempts: 3, windowMs: 60 * 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

/** Protège le formulaire de contact : mêmes mécanismes que la réservation (voir `submissionGuard`), quotas propres. */
export class PublicContactGuard {
  constructor(
    private readonly limiter: RateLimiter,
    private readonly captcha: CaptchaVerifier,
    private readonly options: SubmissionGuardOptions = {},
  ) {}

  async assertCanSend(input: { ip: string | null; email: string; captchaToken: string | null }): Promise<void> {
    await assertSubmissionAllowed(
      {
        limiter: this.limiter,
        captcha: this.captcha,
        scope: 'contact',
        perIp: CONTACT_RATE_LIMITS.perIp,
        perEmail: CONTACT_RATE_LIMITS.perEmail,
        options: this.options,
      },
      input,
    );
  }
}
