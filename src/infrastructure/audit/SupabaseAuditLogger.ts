// src/infrastructure/audit/SupabaseAuditLogger.ts
import type { AuditLogger, AuditEntry } from '@/domain/shared/AuditLogger';
import { getClientIp } from '@/infrastructure/http/getClientIp';
import { createServiceRoleClient } from '@/infrastructure/supabase/serviceRoleClient';

/**
 * Implémentation Supabase du journal d'audit.
 *
 * Utilise systématiquement le client service_role : la journalisation est une
 * responsabilité SYSTÈME, pas celle de l'acteur qui a déclenché l'action.
 * Un visiteur anonyme qui annule son RDV via token doit pouvoir générer une
 * ligne d'audit, alors qu'il n'a lui-même aucun droit d'écriture sur la table.
 */
export class SupabaseAuditLogger implements AuditLogger {
  async log(entry: AuditEntry): Promise<void> {
    try {
      const supabase = createServiceRoleClient();

      const { error } = await supabase.from('audit_logs').insert({
        actor_id: entry.actorId,
        actor_role: entry.actorRole,
        action: entry.action,
        target_type: entry.targetType,
        target_id: entry.targetId,
        metadata: (entry.metadata ?? {}) as never,
        ip_address: entry.ipAddress ?? (await resolveClientIp()),
      });

      if (error) reportFailure(error.message);
    } catch (error) {
      reportFailure(error instanceof Error ? error.message : String(error));
    }
  }
}

/**
 * On ne bloque jamais l'action métier principale si la journalisation échoue :
 * on logue l'erreur côté serveur sans la propager (le RDV, lui, a bien été créé).
 */
function reportFailure(message: string): void {
  console.error("[SupabaseAuditLogger] Échec d'écriture du journal d'audit :", message);
}

/**
 * IP de la requête en cours. Hors requête HTTP (script de seed, test), `headers()` lève
 * une erreur : l'absence d'IP n'est alors pas un échec, la colonne reste simplement vide.
 */
async function resolveClientIp(): Promise<string | null> {
  try {
    return await getClientIp();
  } catch {
    return null;
  }
}
