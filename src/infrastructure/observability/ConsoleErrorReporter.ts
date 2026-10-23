// src/infrastructure/observability/ConsoleErrorReporter.ts
import type { ErrorReporter, ErrorReportContext } from '@/domain/shared/ErrorReporter';
import { scrubError, scrubTags } from './scrubPersonalData';

/**
 * Adaptateur par défaut : écrit l'erreur, masquée, sur la sortie d'erreur du serveur (journaux de l'hébergeur).
 * Un adaptateur Sentry remplace celui-ci dans `createErrorReporter` ; il doit appeler les mêmes fonctions
 * de masquage avant tout envoi (`beforeSend`).
 */
export class ConsoleErrorReporter implements ErrorReporter {
  report(error: unknown, context: ErrorReportContext): void {
    try {
      console.error('[ErrorReporter]', context.source, { ...scrubError(error), tags: scrubTags(context.tags) });
    } catch {
      // Contrat du port : le signalement ne doit jamais lever.
    }
  }
}
