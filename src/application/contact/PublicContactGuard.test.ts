// src/application/contact/PublicContactGuard.test.ts
import { describe, expect, it, vi } from 'vitest';
import { PublicBookingGuard } from '@/application/booking/PublicBookingGuard';
import type { RateLimiter } from '@/domain/shared/RateLimiter';
import { InMemoryRateLimiter } from '@/infrastructure/ratelimit/InMemoryRateLimiter';
import { FakeCaptchaVerifier } from '@/test/fakes/FakeCaptchaVerifier';
import { CONTACT_RATE_LIMITS, PublicContactGuard } from './PublicContactGuard';

function setup() {
  let now = 1_000_000;
  const limiter = new InMemoryRateLimiter(() => now);
  const captcha = new FakeCaptchaVerifier();
  return { limiter, captcha, guard: new PublicContactGuard(limiter, captcha), advance: (ms: number) => (now += ms) };
}

const send = (guard: PublicContactGuard, overrides: Partial<{ ip: string | null; email: string; captchaToken: string | null }> = {}) =>
  guard.assertCanSend({ ip: '203.0.113.7', email: 'alice@example.com', captchaToken: 'jeton', ...overrides });

const expectCode = (promise: Promise<unknown>, code: string) => expect(promise).rejects.toMatchObject({ code });

describe('PublicContactGuard', () => {
  it('laisse passer un message ordinaire', async () => {
    const { guard } = setup();

    await expect(send(guard)).resolves.toBeUndefined();
  });

  it('limite les messages par IP', async () => {
    const { guard } = setup();
    for (let attempt = 0; attempt < CONTACT_RATE_LIMITS.perIp.maxAttempts; attempt++) {
      await send(guard, { email: `visiteur${attempt}@example.com` });
    }

    await expectCode(send(guard, { email: 'autre@example.com' }), 'TOO_MANY_ATTEMPTS');
  });

  it('limite les messages par adresse email, d\'où qu\'ils viennent', async () => {
    const { guard } = setup();
    for (let attempt = 0; attempt < CONTACT_RATE_LIMITS.perEmail.maxAttempts; attempt++) {
      await send(guard, { ip: `203.0.113.${attempt}` });
    }

    await expectCode(send(guard, { ip: '198.51.100.1' }), 'TOO_MANY_ATTEMPTS');
  });

  it('refuse quand l\'anti-robot échoue', async () => {
    const { guard, captcha } = setup();
    captcha.result = false;

    await expectCode(send(guard), 'CAPTCHA_FAILED');
  });

  it('rouvre le quota quand la fenêtre est écoulée', async () => {
    const { guard, advance } = setup();
    for (let attempt = 0; attempt < CONTACT_RATE_LIMITS.perIp.maxAttempts; attempt++) {
      await send(guard, { email: `visiteur${attempt}@example.com` });
    }
    advance(CONTACT_RATE_LIMITS.perIp.windowMs + 1);

    await expect(send(guard, { email: 'autre@example.com' })).resolves.toBeUndefined();
  });

  it('ne partage pas son quota avec celui de la réservation', async () => {
    const { guard, limiter, captcha } = setup();
    const booking = new PublicBookingGuard(limiter, captcha);
    for (let attempt = 0; attempt < CONTACT_RATE_LIMITS.perIp.maxAttempts; attempt++) {
      await send(guard, { email: `visiteur${attempt}@example.com` });
    }
    await expectCode(send(guard, { email: 'autre@example.com' }), 'TOO_MANY_ATTEMPTS');

    await expect(
      booking.assertCanCreate({ ip: '203.0.113.7', email: 'alice@example.com', captchaToken: 'jeton' }),
    ).resolves.toBeUndefined();
  });

  it('laisse passer et signale la panne quand le limiteur est indisponible', async () => {
    const failing: RateLimiter = {
      check: vi.fn().mockRejectedValue(new Error('base injoignable')),
      record: vi.fn(),
      reset: vi.fn(),
    };
    const report = vi.fn();
    const guard = new PublicContactGuard(failing, new FakeCaptchaVerifier(), { reportInfrastructureError: report });

    await expect(send(guard)).resolves.toBeUndefined();

    expect(report).toHaveBeenCalled();
  });
});
