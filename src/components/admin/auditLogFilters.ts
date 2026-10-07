// src/components/admin/auditLogFilters.ts
import type { ActorRole } from '@/domain/shared/AuditLogger';
import type { AuditLogFiltersValues } from '@/lib/validation/auditLogs';

/** État du formulaire de filtres : des chaînes (champs de formulaire), `''` signifiant « pas de filtre ». */
export type AuditFiltersState = {
  actorId: string;
  /** Libellé de la pastille « Auteur : … » ; n'est jamais envoyé au serveur. */
  actorLabel: string;
  actorRole: ActorRole | '';
  action: string;
  targetType: string;
  targetId: string;
  dateFrom: string;
  dateTo: string;
};

export const EMPTY_AUDIT_FILTERS: AuditFiltersState = {
  actorId: '',
  actorLabel: '',
  actorRole: '',
  action: '',
  targetType: '',
  targetId: '',
  dateFrom: '',
  dateTo: '',
};

/**
 * Convertit l'état du formulaire en filtres pour le serveur : un champ vide est OMIS
 * (le schéma Zod refuse une chaîne vide plutôt que de la traiter comme « aucun filtre »).
 */
export function toFilterPayload(state: AuditFiltersState): AuditLogFiltersValues {
  const payload: AuditLogFiltersValues = {};
  const targetId = state.targetId.trim();

  if (state.actorId) payload.actorId = state.actorId;
  if (state.actorRole) payload.actorRole = state.actorRole;
  if (state.action) payload.action = state.action;
  if (state.targetType) payload.targetType = state.targetType;
  if (targetId) payload.targetId = targetId;
  if (state.dateFrom) payload.dateFrom = state.dateFrom;
  if (state.dateTo) payload.dateTo = state.dateTo;

  return payload;
}

/** Même règle que le serveur : une période dont le début suit la fin est refusée avant tout appel. */
export function hasInvalidPeriod({ dateFrom, dateTo }: Pick<AuditFiltersState, 'dateFrom' | 'dateTo'>): boolean {
  return Boolean(dateFrom && dateTo && dateFrom > dateTo);
}
