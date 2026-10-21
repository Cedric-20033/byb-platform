// src/infrastructure/observability/createErrorReporter.ts
import type { ErrorReporter } from '@/domain/shared/ErrorReporter';
import { ConsoleErrorReporter } from './ConsoleErrorReporter';

/**
 * Point unique de choix de l'outil de supervision.
 *
 * Pour brancher Sentry : `npm i @sentry/nextjs`, écrire `SentryErrorReporter implements ErrorReporter`
 * (`Sentry.captureException` avec `beforeSend` appliquant `scrubError`/`scrubTags`, `sendDefaultPii: false`),
 * puis le retourner ici quand `SENTRY_DSN` est définie. Aucun autre fichier ne change.
 */
export function createErrorReporter(): ErrorReporter {
  return new ConsoleErrorReporter();
}
