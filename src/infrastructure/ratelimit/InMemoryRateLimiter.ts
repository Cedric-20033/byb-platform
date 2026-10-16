// src/infrastructure/ratelimit/InMemoryRateLimiter.ts
import type { RateLimitDecision, RateLimitPolicy, RateLimiter } from '@/domain/shared/RateLimiter';

/** Au-delà, on purge les clés expirées pour que la mémoire reste bornée. */
const SWEEP_THRESHOLD = 5_000;

/**
 * Limiteur à fenêtre glissante, en mémoire du processus.
 *
 * ⚠ Limite connue : le compteur est propre à chaque instance serveur. Sur un
 * hébergement à plusieurs instances ou sans état (serverless), un attaquant
 * répartit ses essais entre instances. Il constitue une première barrière ;
 * Supabase Auth applique en plus ses propres limites côté service. Les actions publiques de
 * réservation utilisent l'adaptateur partagé `SupabaseRateLimiter` (table `rate_limit_events`),
 * derrière le même port ; la connexion admin pourra y passer de la même façon.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly attempts = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  async check(key: string, policy: RateLimitPolicy): Promise<RateLimitDecision> {
    const recent = this.recentAttempts(key, policy.windowMs);
    if (recent.length < policy.maxAttempts) return { allowed: true, retryAfterMs: 0 };

    // Le quota se libère quand la plus ancienne tentative sort de la fenêtre.
    const oldest = recent[0];
    return { allowed: false, retryAfterMs: Math.max(0, oldest + policy.windowMs - this.now()) };
  }

  async record(key: string, policy: RateLimitPolicy): Promise<void> {
    const recent = this.recentAttempts(key, policy.windowMs);
    recent.push(this.now());
    this.attempts.set(key, recent);

    if (this.attempts.size > SWEEP_THRESHOLD) this.sweep(policy.windowMs);
  }

  async reset(key: string): Promise<void> {
    this.attempts.delete(key);
  }

  private recentAttempts(key: string, windowMs: number): number[] {
    const threshold = this.now() - windowMs;
    return (this.attempts.get(key) ?? []).filter((timestamp) => timestamp > threshold);
  }

  private sweep(windowMs: number): void {
    for (const key of this.attempts.keys()) {
      if (this.recentAttempts(key, windowMs).length === 0) this.attempts.delete(key);
    }
  }
}

/**
 * Instance partagée par les Server Actions d'authentification. Accrochée à
 * `globalThis` pour survivre au rechargement à chaud de Next.js en développement.
 */
const globalForLimiter = globalThis as typeof globalThis & { __authRateLimiter?: InMemoryRateLimiter };

export const authRateLimiter: RateLimiter = (globalForLimiter.__authRateLimiter ??= new InMemoryRateLimiter());
