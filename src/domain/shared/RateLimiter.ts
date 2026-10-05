// src/domain/shared/RateLimiter.ts

export type RateLimitPolicy = {
  /** Nombre de tentatives tolérées dans la fenêtre. */
  maxAttempts: number;
  windowMs: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  /** Délai avant qu'une tentative soit de nouveau acceptée (0 si autorisée). */
  retryAfterMs: number;
};

/**
 * Port de sortie : limitation de débit (connexion, demande de réinitialisation…).
 *
 * `check` et `record` sont séparés pour ne compter que les ÉCHECS : un admin qui
 * se connecte correctement ne consomme pas son quota (et `reset` le remet à zéro).
 */
export interface RateLimiter {
  /** Indique si la clé a dépassé son quota, sans consommer de tentative. */
  check(key: string, policy: RateLimitPolicy): Promise<RateLimitDecision>;
  /** Enregistre une tentative pour la clé. */
  record(key: string, policy: RateLimitPolicy): Promise<void>;
  reset(key: string): Promise<void>;
}
