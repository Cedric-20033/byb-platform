// src/lib/health/checkHealth.ts

export type HealthReport = {
  status: 'ok' | 'degraded';
  /** Un verdict par dépendance ; jamais de message d'erreur (la sonde est publique). */
  checks: { database: 'ok' | 'down' };
  timestamp: string;
};

/** Délai au-delà duquel une dépendance est jugée en panne : une sonde qui pend est pire qu'une sonde qui échoue. */
const PROBE_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * Interroge chaque dépendance critique. `probeDatabase` est injectée (une lecture minimale) pour que la logique
 * reste testable sans base réelle.
 */
export async function checkHealth(
  probeDatabase: () => Promise<void>,
  now: () => Date = () => new Date(),
): Promise<HealthReport> {
  const database = await withTimeout(probeDatabase(), PROBE_TIMEOUT_MS).then(
    () => 'ok' as const,
    () => 'down' as const,
  );

  return { status: database === 'ok' ? 'ok' : 'degraded', checks: { database }, timestamp: now().toISOString() };
}
