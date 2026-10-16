// src/application/booking/PublicBookingGuard.test.ts
import { describe, expect, it, vi } from 'vitest';
import type { RateLimiter } from '@/domain/shared/RateLimiter';
import { InMemoryRateLimiter } from '@/infrastructure/ratelimit/InMemoryRateLimiter';
import { FakeCaptchaVerifier } from '@/test/fakes/FakeCaptchaVerifier';
import { BOOKING_RATE_LIMITS, PublicBookingGuard } from './PublicBookingGuard';

function setup() {
  let now = 1_000_000;
  const limiter = new InMemoryRateLimiter(() => now);
  const captcha = new FakeCaptchaVerifier();
  const guard = new PublicBookingGuard(limiter, captcha);
  return { guard, captcha, advance: (ms: number) => (now += ms) };
}

const create = (guard: PublicBookingGuard, overrides: Partial<{ ip: string | null; email: string; captchaToken: string | null }> = {}) =>
  guard.assertCanCreate({ ip: '203.0.113.7', email: 'alice@example.com', captchaToken: 'jeton', ...overrides });

const expectCode = (promise: Promise<unknown>, code: string) => expect(promise).rejects.toMatchObject({ code });

describe('PublicBookingGuard.assertCanCreate', () => {
  it('laisse passer une demande ordinaire', async () => {
    const { guard } = setup();

    await expect(create(guard)).resolves.toBeUndefined();
  });

  it('transmet le jeton et l\'IP au vérificateur anti-robot', async () => {
    const { guard, captcha } = setup();

    await create(guard, { captchaToken: 'abc', ip: '203.0.113.9' });

    expect(captcha.calls).toEqual([{ token: 'abc', ip: '203.0.113.9' }]);
  });

  it('refuse quand l\'anti-robot échoue', async () => {
    const { guard, captcha } = setup();
    captcha.result = false;

    await expectCode(create(guard), 'CAPTCHA_FAILED');
  });

  it('limite le nombre de tentatives par IP', async () => {
    const { guard } = setup();
    for (let attempt = 0; attempt < BOOKING_RATE_LIMITS.createPerIp.maxAttempts; attempt++) {
      await create(guard, { email: `visiteur${attempt}@example.com` });
    }

    await expectCode(create(guard, { email: 'autre@example.com' }), 'TOO_MANY_ATTEMPTS');
  });

  it('limite le nombre de tentatives par adresse email, d\'où qu\'elles viennent', async () => {
    const { guard } = setup();
    for (let attempt = 0; attempt < BOOKING_RATE_LIMITS.createPerEmail.maxAttempts; attempt++) {
      await create(guard, { ip: `203.0.113.${attempt}`, email: 'Alice@Example.com' });
    }

    await expectCode(create(guard, { ip: '198.51.100.1', email: 'alice@example.com' }), 'TOO_MANY_ATTEMPTS');
  });

  it('ne consomme pas le quota d\'une adresse tant que l\'anti-robot n\'est pas passé', async () => {
    const { guard, captcha } = setup();
    captcha.result = false;
    for (let attempt = 0; attempt < BOOKING_RATE_LIMITS.createPerEmail.maxAttempts + 1; attempt++) {
      await expectCode(create(guard, { ip: `203.0.113.${attempt}` }), 'CAPTCHA_FAILED');
    }
    captcha.result = true;

    await expect(create(guard, { ip: '198.51.100.1' })).resolves.toBeUndefined();
  });

  it('rouvre le quota quand la fenêtre est écoulée', async () => {
    const { guard, advance } = setup();
    for (let attempt = 0; attempt < BOOKING_RATE_LIMITS.createPerIp.maxAttempts; attempt++) {
      await create(guard, { email: `visiteur${attempt}@example.com` });
    }
    await expectCode(create(guard, { email: 'autre@example.com' }), 'TOO_MANY_ATTEMPTS');

    advance(BOOKING_RATE_LIMITS.createPerIp.windowMs + 1);

    await expect(create(guard, { email: 'autre@example.com' })).resolves.toBeUndefined();
  });

  it('regroupe les visiteurs dont l\'IP est inconnue dans un même quota', async () => {
    const { guard } = setup();
    for (let attempt = 0; attempt < BOOKING_RATE_LIMITS.createPerIp.maxAttempts; attempt++) {
      await create(guard, { ip: null, email: `visiteur${attempt}@example.com` });
    }

    await expectCode(create(guard, { ip: null, email: 'autre@example.com' }), 'TOO_MANY_ATTEMPTS');
  });
});

describe('PublicBookingGuard.assertCanUseToken', () => {
  it('limite les accès par jeton par IP', async () => {
    const { guard } = setup();
    for (let attempt = 0; attempt < BOOKING_RATE_LIMITS.tokenPerIp.maxAttempts; attempt++) {
      await guard.assertCanUseToken({ ip: '203.0.113.7' });
    }

    await expectCode(guard.assertCanUseToken({ ip: '203.0.113.7' }), 'TOO_MANY_ATTEMPTS');
    await expect(guard.assertCanUseToken({ ip: '203.0.113.8' })).resolves.toBeUndefined();
  });

  it('ne partage pas son quota avec celui de la réservation', async () => {
    const { guard } = setup();
    for (let attempt = 0; attempt < BOOKING_RATE_LIMITS.tokenPerIp.maxAttempts; attempt++) {
      await guard.assertCanUseToken({ ip: '203.0.113.7' });
    }

    await expect(create(guard)).resolves.toBeUndefined();
  });
});

describe('PublicBookingGuard : panne du limiteur', () => {
  const failingLimiter: RateLimiter = {
    check: vi.fn().mockRejectedValue(new Error('base injoignable')),
    record: vi.fn().mockRejectedValue(new Error('base injoignable')),
    reset: vi.fn(),
  };

  it('laisse passer la requête et signale la panne', async () => {
    const report = vi.fn();
    const guard = new PublicBookingGuard(failingLimiter, new FakeCaptchaVerifier(), { reportInfrastructureError: report });

    await expect(create(guard)).resolves.toBeUndefined();

    expect(report).toHaveBeenCalled();
  });

  it('refuse toujours quand l\'anti-robot échoue, même si le limiteur est en panne', async () => {
    const guard = new PublicBookingGuard(failingLimiter, new FakeCaptchaVerifier(false));

    await expectCode(create(guard), 'CAPTCHA_FAILED');
  });
});
