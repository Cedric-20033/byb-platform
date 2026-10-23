// src/domain/shared/Clock.ts

/**
 * Port : source de l'heure courante.
 * Injecter une horloge plutôt qu'appeler `new Date()` dans les use cases rend
 * les règles dépendant de "maintenant" (aujourd'hui, cette semaine) testables
 * de façon déterministe, notamment autour de minuit et des changements d'heure.
 */
export interface Clock {
  now(): Date;
}

/** Horloge réelle, utilisée par défaut en production. */
export const systemClock: Clock = {
  now: () => new Date(),
};
