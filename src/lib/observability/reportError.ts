// src/lib/observability/reportError.ts
import type { ErrorReporter, ErrorReportContext } from '@/domain/shared/ErrorReporter';
import { createErrorReporter } from '@/infrastructure/observability/createErrorReporter';

let reporter: ErrorReporter | undefined;

/**
 * Signale une erreur inattendue à l'outil de supervision configuré. Instance créée à la première utilisation
 * et réutilisée : un seul adaptateur par processus serveur.
 */
export function reportError(error: unknown, context: ErrorReportContext): void {
  reporter ??= createErrorReporter();
  reporter.report(error, context);
}
