// src/infrastructure/supabase/repositories/SupabaseAuditLogReader.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database';
import type { AuditLogEntry } from '@/domain/audit/AuditLogEntry';
import type {
  AuditLogPage,
  AuditLogPageRequest,
  AuditLogReader,
  AuditLogSearchCriteria,
} from '@/domain/audit/AuditLogReader';
import { ActorRole } from '@/domain/shared/AuditLogger';

/** `actor` : jointure sur le profil de l'auteur (nom et email affichés dans la page). */
const COLUMNS =
  'id, actor_id, actor_role, action, target_type, target_id, metadata, ip_address, created_at, actor:profiles(full_name, email)' as const;

const ACTOR_ROLES: readonly string[] = Object.values(ActorRole);

/**
 * Lecteur Supabase du journal d'audit.
 *
 * Le client injecté porte la session de l'appelant : la policy RLS `audit_logs_select_admin`
 * (permission `audit_logs.view`) reste la seconde barrière après le contrôle applicatif.
 * Pour la même raison, la jointure sur `profiles` obéit au RLS de `profiles` : un admin
 * ne lit que son propre profil, donc nom et email des autres auteurs lui restent masqués
 * (seul le superadmin les voit). Le modèle de lecture le prévoit : ces champs sont nullables.
 */
export class SupabaseAuditLogReader implements AuditLogReader {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async search(criteria: AuditLogSearchCriteria, { limit, after }: AuditLogPageRequest): Promise<AuditLogPage> {
    let query = this.supabase.from('audit_logs').select(COLUMNS);

    if (criteria.actorId) query = query.eq('actor_id', criteria.actorId);
    if (criteria.actorRole) query = query.eq('actor_role', criteria.actorRole);
    if (criteria.action) query = query.eq('action', criteria.action);
    if (criteria.targetType) query = query.eq('target_type', criteria.targetType);
    if (criteria.targetId) query = query.eq('target_id', criteria.targetId);
    if (criteria.occurredFrom) query = query.gte('created_at', criteria.occurredFrom);
    if (criteria.occurredBefore) query = query.lt('created_at', criteria.occurredBefore);

    if (after) {
      // Pagination « keyset » : les lignes strictement APRÈS le curseur dans l'ordre (created_at, id) décroissant.
      // Les deux valeurs ont été validées par `isAuditLogCursor` : aucune virgule ni parenthèse ne peut
      // s'y glisser et altérer le filtre `or()`.
      query = query.or(
        `created_at.lt.${after.createdAt},and(created_at.eq.${after.createdAt},id.lt.${after.id})`,
      );
    }

    // `id` départage deux lignes de même `created_at` : sans lui, l'ordre (donc le curseur) ne serait pas total.
    // On lit une ligne de plus que demandé : sa seule présence indique qu'il existe une page suivante.
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1);

    if (error) throw new Error(error.message);

    const hasMore = data.length > limit;
    const rows = hasMore ? data.slice(0, limit) : data;
    const last = rows.at(-1);

    return {
      entries: rows.map(toEntry),
      nextCursor: hasMore && last ? { createdAt: toZuluTimestamp(last.created_at), id: last.id } : null,
    };
  }
}

type AuditRow = {
  id: string;
  actor_id: string | null;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Json;
  ip_address: string | null;
  created_at: string;
  actor: { full_name: string; email: string } | { full_name: string; email: string }[] | null;
};

function toEntry(row: AuditRow): AuditLogEntry {
  // Selon la version du client, une jointure « plusieurs-à-un » est typée objet ou tableau : on accepte les deux.
  const actor = Array.isArray(row.actor) ? (row.actor[0] ?? null) : row.actor;

  return {
    id: row.id,
    actorId: row.actor_id,
    actorName: actor?.full_name ?? null,
    actorEmail: actor?.email ?? null,
    actorRole: toActorRole(row.actor_role),
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: toMetadata(row.metadata),
    ipAddress: row.ip_address,
    createdAt: row.created_at,
  };
}

/** `actor_role` est une colonne `text` (CHECK en base) : on valide plutôt que de caster. */
function toActorRole(value: string): ActorRole {
  if (!ACTOR_ROLES.includes(value)) {
    throw new Error(`Rôle d'auteur invalide dans le journal d'audit : "${value}"`);
  }
  return value as ActorRole;
}

/** `metadata` est un objet par construction (défaut `{}`) ; toute autre forme est enveloppée plutôt que perdue. */
function toMetadata(value: Json): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : { value };
}

/**
 * PostgREST renvoie « +00:00 » ; le curseur travaille en « Z » (voir AuditLogCursor),
 * forme qui n'a pas de « + » susceptible d'être lu comme une espace dans une URL.
 */
function toZuluTimestamp(value: string): string {
  return value.replace(/\+00:00$/, 'Z');
}
