// src/instrumentation.ts
import type { Instrumentation } from 'next';

/**
 * Exécutée une fois au démarrage du serveur Next.js, avant la première requête.
 * La validation de l'environnement est ignorée pendant `next build` : l'image Docker compile sans les
 * secrets de production, qui ne sont fournis qu'à l'exécution (`env_file`).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const { validateEnv } = await import('@/lib/env');
  validateEnv();
}

/** Toute erreur serveur non interceptée (rendu, route, action) est signalée, données personnelles masquées. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { reportError } = await import('@/lib/observability/reportError');
  reportError(error, {
    source: `request:${context.routeType}`,
    // Le chemin peut contenir un jeton de rendez-vous : `reportError` le masque avant l'envoi.
    tags: { path: request.path, method: request.method, route: context.routePath },
  });
};
