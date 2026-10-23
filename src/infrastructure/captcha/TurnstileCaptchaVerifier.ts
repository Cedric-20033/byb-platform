// src/infrastructure/captcha/TurnstileCaptchaVerifier.ts
import type { CaptchaVerifier } from '@/domain/shared/CaptchaVerifier';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 5000;

/**
 * Vérifie le jeton produit par le widget Cloudflare Turnstile.
 *
 * Refus uniquement sur réponse explicite de Cloudflare (`success: false`) ou jeton absent. Si le service
 * lui-même est injoignable (panne, délai dépassé), la requête est acceptée : le quota par IP et par email
 * reste actif, et une panne chez un tiers ne doit pas rendre la réservation impossible.
 */
export class TurnstileCaptchaVerifier implements CaptchaVerifier {
  constructor(
    private readonly secretKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async verify(token: string | null, ip: string | null): Promise<boolean> {
    if (!token) return false;

    const body = new URLSearchParams({ secret: this.secretKey, response: token });
    if (ip) body.set('remoteip', ip);

    try {
      const response = await this.fetchImpl(SITEVERIFY_URL, {
        method: 'POST',
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) return true;

      const result = (await response.json()) as { success?: boolean };
      return result.success === true;
    } catch {
      return true;
    }
  }
}
