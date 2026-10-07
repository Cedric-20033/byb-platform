// src/lib/validation/auditLogs.ts
import { z } from 'zod';
import { ActorRole } from '@/domain/shared/AuditLogger';

/**
 * Filtres du journal d'audit. Chaque champ est optionnel : un champ vide est ABSENT
 * (le client retire les chaînes vides), jamais une chaîne vide.
 * Les messages sont des clés `errors.validation.*` (voir `messages.ts`).
 */
export const auditLogFiltersSchema = z
  .object({
    actorId: z.uuid({ error: 'invalid' }).optional(),
    actorRole: z.enum(ActorRole, { error: 'invalid' }).optional(),
    // Codes d'action en MAJUSCULES_SNAKE (AuditAction) et types de cible en minuscules_snake :
    // le format est contraint, mais pas la liste, pour qu'une action retirée du code reste filtrable.
    action: z.string().regex(/^[A-Z][A-Z_]{1,63}$/, { error: 'invalid' }).optional(),
    targetType: z.string().regex(/^[a-z][a-z_]{1,39}$/, { error: 'invalid' }).optional(),
    targetId: z.string().trim().min(1, { error: 'invalid' }).max(100, { error: 'invalid' }).optional(),
    dateFrom: z.iso.date({ error: 'startDateInvalid' }).optional(),
    dateTo: z.iso.date({ error: 'endDateInvalid' }).optional(),
  })
  .refine((filters) => !filters.dateFrom || !filters.dateTo || filters.dateFrom <= filters.dateTo, {
    error: 'startDateAfterEnd',
    path: ['dateTo'],
  });

export type AuditLogFiltersValues = z.infer<typeof auditLogFiltersSchema>;

/** Une page du journal : filtres + curseur opaque de la page précédente (`null` pour la première). */
export const listAuditLogsSchema = z.object({
  filters: auditLogFiltersSchema.optional(),
  cursor: z.string().min(1).max(300).nullish(),
});

export const exportAuditLogsSchema = z.object({
  filters: auditLogFiltersSchema.optional(),
});
