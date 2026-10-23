// src/infrastructure/ratelimit/SupabaseRateLimiter.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { RateLimitDecision, RateLimitPolicy, RateLimiter } from '@/domain/shared/RateLimiter';

/** Durée de conservation des tentatives : bien au-delà de la fenêtre la plus longue (1 h). */
const RETENTION_MS = 24 * 60 * 60_000;
/** Probabilité de purger les anciennes lignes à chaque enregistrement (évite un cron dédié). */
const PURGE_PROBABILITY = 0.02;
/** Borne de lecture : les tentatives refusées ne sont pas enregistrées, la fenêtre ne dépasse donc jamais le quota. */
const MAX_ROWS_READ = 1000;

/**
 * Limiteur de débit partagé entre toutes les instances de l'application (contrairement à
 * `InMemoryRateLimiter`, propre à un processus), adossé à la table `rate_limit_events`.
 * Attend un client service_role : la table est fermée à anon et authenticated.
 *
 * Fenêtre glissante : une tentative compte tant qu'elle est plus récente que `windowMs`.
 */
export class SupabaseRateLimiter implements RateLimiter {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly now: () => Date = () => new Date(),
    private readonly random: () => number = Math.random,
  ) {}

  async check(key: string, policy: RateLimitPolicy): Promise<RateLimitDecision> {
    const nowMs = this.now().getTime();
    const cutoff = new Date(nowMs - policy.windowMs).toISOString();

    const { data, error } = await this.supabase
      .from('rate_limit_events')
      .select('occurred_at')
      .eq('key', key)
      .gt('occurred_at', cutoff)
      .order('occurred_at', { ascending: true })
      .limit(MAX_ROWS_READ);

    if (error) throw new Error(error.message);
    if (data.length < policy.maxAttempts) return { allowed: true, retryAfterMs: 0 };

    // Quota atteint : une place se libère quand la tentative qui « dépasse » sort de la fenêtre.
    const blocking = data[data.length - policy.maxAttempts];
    const retryAfterMs = Date.parse(blocking.occurred_at) + policy.windowMs - nowMs;
    return { allowed: false, retryAfterMs: Math.max(0, retryAfterMs) };
  }

  async record(key: string): Promise<void> {
    const { error } = await this.supabase.from('rate_limit_events').insert({ key });
    if (error) throw new Error(error.message);

    if (this.random() < PURGE_PROBABILITY) {
      // Meilleur effort : un échec de purge ne doit pas faire échouer l'enregistrement.
      await this.supabase
        .from('rate_limit_events')
        .delete()
        .lt('occurred_at', new Date(this.now().getTime() - RETENTION_MS).toISOString());
    }
  }

  async reset(key: string): Promise<void> {
    const { error } = await this.supabase.from('rate_limit_events').delete().eq('key', key);
    if (error) throw new Error(error.message);
  }
}
