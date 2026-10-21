// src/domain/shared/ErrorReporter.ts

/** Circonstances d'une erreur : où elle s'est produite, sans donnée personnelle. */
export type ErrorReportContext = {
  /** Origine technique, par exemple 'server-action' ou 'request:render'. */
  source: string;
  /** Étiquettes de filtrage (route, type de rendu...). Jamais d'identité ni de contenu saisi par un visiteur. */
  tags?: Record<string, string>;
};

/**
 * Port de signalement des erreurs inattendues. Le domaine et les use cases ne connaissent pas l'outil de
 * supervision : brancher Sentry (ou un autre) revient à écrire un nouvel adaptateur, sans toucher au reste.
 *
 * Contrat : `report` ne lève jamais d'exception et ne bloque pas l'appelant. Une panne de supervision
 * ne doit jamais aggraver l'incident qu'elle signale.
 */
export interface ErrorReporter {
  report(error: unknown, context: ErrorReportContext): void;
}
