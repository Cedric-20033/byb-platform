// src/infrastructure/ratelimit/InMemoryRateLimiter.test.ts
import { describe, expect, it } from 'vitest';
import { InMemoryRateLimiter } from './InMemoryRateLimiter';

const POLICY = { maxAttempts: 3, windowMs: 60_000 };

function setup() {
  let now = 1_000_000;
  const limiter = new InMemoryRateLimiter(() => now);
  return { limiter, advance: (ms: number) => (now += ms) };
}

describe('InMemoryRateLimiter', () => {
  it('autorise tant que le quota n\'est pas atteint', async () => {
    const { limiter } = setup();

    await limiter.record('k', POLICY);
    await limiter.record('k', POLICY);

    expect((await limiter.check('k', POLICY)).allowed).toBe(true);
  });

  it('bloque une fois le quota atteint et indique le délai restant', async () => {
    const { limiter, advance } = setup();

    await limiter.record('k', POLICY);
    advance(10_000);
    await limiter.record('k', POLICY);
    await limiter.record('k', POLICY);

    const decision = await limiter.check('k', POLICY);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterMs).toBe(50_000);
  });

  it('ne consomme pas de tentative lors d\'un simple contrôle', async () => {
    const { limiter } = setup();

    for (let i = 0; i < 10; i++) await limiter.check('k', POLICY);

    expect((await limiter.check('k', POLICY)).allowed).toBe(true);
  });

  it('libère le quota quand les tentatives sortent de la fenêtre', async () => {
    const { limiter, advance } = setup();
    for (let i = 0; i < 3; i++) await limiter.record('k', POLICY);

    advance(60_001);

    expect((await limiter.check('k', POLICY)).allowed).toBe(true);
  });

  it('isole les clés entre elles', async () => {
    const { limiter } = setup();
    for (let i = 0; i < 3; i++) await limiter.record('a', POLICY);

    expect((await limiter.check('a', POLICY)).allowed).toBe(false);
    expect((await limiter.check('b', POLICY)).allowed).toBe(true);
  });

  it('remet le compteur à zéro avec reset', async () => {
    const { limiter } = setup();
    for (let i = 0; i < 3; i++) await limiter.record('k', POLICY);

    await limiter.reset('k');

    expect((await limiter.check('k', POLICY)).allowed).toBe(true);
  });
});
