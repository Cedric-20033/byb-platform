// src/infrastructure/captcha/createCaptchaVerifier.ts
import type { CaptchaVerifier } from '@/domain/shared/CaptchaVerifier';
import { TurnstileCaptchaVerifier } from './TurnstileCaptchaVerifier';

/** Anti-robot désactivé : tout est accepté (développement local, ou clé Turnstile pas encore configurée). */
export class NoopCaptchaVerifier implements CaptchaVerifier {
  async verify(): Promise<boolean> {
    return true;
  }
}

/**
 * Choisit l'implémentation selon l'environnement : Turnstile dès que `TURNSTILE_SECRET_KEY` est définie.
 * Côté navigateur, le widget n'apparaît que si `NEXT_PUBLIC_TURNSTILE_SITE_KEY` l'est aussi : les deux
 * variables vont ensemble (voir .env.example).
 */
export function createCaptchaVerifier(env: Record<string, string | undefined> = process.env): CaptchaVerifier {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  return secret ? new TurnstileCaptchaVerifier(secret) : new NoopCaptchaVerifier();
}
