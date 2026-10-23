// src/test/fakes/FakeCaptchaVerifier.ts
import type { CaptchaVerifier } from '@/domain/shared/CaptchaVerifier';

/** Vérificateur anti-robot réglable ; garde les appels reçus pour les assertions. */
export class FakeCaptchaVerifier implements CaptchaVerifier {
  readonly calls: { token: string | null; ip: string | null }[] = [];

  constructor(public result: boolean = true) {}

  async verify(token: string | null, ip: string | null): Promise<boolean> {
    this.calls.push({ token, ip });
    return this.result;
  }
}
