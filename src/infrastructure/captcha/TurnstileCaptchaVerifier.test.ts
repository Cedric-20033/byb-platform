// src/infrastructure/captcha/TurnstileCaptchaVerifier.test.ts
import { describe, expect, it, vi } from 'vitest';
import { NoopCaptchaVerifier, createCaptchaVerifier } from './createCaptchaVerifier';
import { TurnstileCaptchaVerifier } from './TurnstileCaptchaVerifier';

const respond = (body: unknown, init: ResponseInit = {}) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200, ...init }));

describe('TurnstileCaptchaVerifier', () => {
  it('accepte un jeton validé par Cloudflare', async () => {
    const verifier = new TurnstileCaptchaVerifier('secret', respond({ success: true }));

    expect(await verifier.verify('jeton', '203.0.113.7')).toBe(true);
  });

  it('refuse un jeton rejeté par Cloudflare', async () => {
    const verifier = new TurnstileCaptchaVerifier('secret', respond({ success: false, 'error-codes': ['invalid-input-response'] }));

    expect(await verifier.verify('jeton', null)).toBe(false);
  });

  it('refuse l\'absence de jeton sans appeler Cloudflare', async () => {
    const fetchImpl = respond({ success: true });
    const verifier = new TurnstileCaptchaVerifier('secret', fetchImpl);

    expect(await verifier.verify(null, '203.0.113.7')).toBe(false);
    expect(await verifier.verify('', '203.0.113.7')).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('transmet la clé secrète, le jeton et l\'IP', async () => {
    const fetchImpl = respond({ success: true });

    await new TurnstileCaptchaVerifier('secret', fetchImpl).verify('jeton', '203.0.113.7');

    const [url, init] = fetchImpl.mock.calls[0];
    const body = init.body as URLSearchParams;
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(init.method).toBe('POST');
    expect(Object.fromEntries(body)).toEqual({ secret: 'secret', response: 'jeton', remoteip: '203.0.113.7' });
  });

  it('n\'envoie pas d\'IP quand elle est inconnue', async () => {
    const fetchImpl = respond({ success: true });

    await new TurnstileCaptchaVerifier('secret', fetchImpl).verify('jeton', null);

    expect((fetchImpl.mock.calls[0][1].body as URLSearchParams).has('remoteip')).toBe(false);
  });

  it('accepte quand Cloudflare est injoignable : le quota par IP et par email reste actif', async () => {
    const down = vi.fn().mockRejectedValue(new Error('réseau'));

    expect(await new TurnstileCaptchaVerifier('secret', down).verify('jeton', null)).toBe(true);
  });

  it('accepte quand Cloudflare répond par une erreur serveur', async () => {
    const verifier = new TurnstileCaptchaVerifier('secret', respond({}, { status: 503 }));

    expect(await verifier.verify('jeton', null)).toBe(true);
  });
});

describe('createCaptchaVerifier', () => {
  it('désactive la vérification sans clé secrète', async () => {
    const verifier = createCaptchaVerifier({});

    expect(verifier).toBeInstanceOf(NoopCaptchaVerifier);
    expect(await verifier.verify(null, null)).toBe(true);
  });

  it('active Turnstile dès que la clé secrète est définie', () => {
    expect(createCaptchaVerifier({ TURNSTILE_SECRET_KEY: 'secret' })).toBeInstanceOf(TurnstileCaptchaVerifier);
  });

  it('ignore une clé secrète vide', () => {
    expect(createCaptchaVerifier({ TURNSTILE_SECRET_KEY: '  ' })).toBeInstanceOf(NoopCaptchaVerifier);
  });
});
