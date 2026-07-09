// src/infrastructure/audit/SupabaseAuditLogger.ts
import type { AuditLogger, AuditEntry } from '@/domain/shared/AuditLogger';
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
    const supabase = createServiceRoleClient();

    const { error } = await supabase.from('audit_logs').insert({
      actor_id: entry.actorId,
      actor_role: entry.actorRole,
      action: entry.action,
      target_type: entry.targetType,
      target_id: entry.targetId,
      metadata: (entry.metadata ?? {}) as never,
      ip_address: entry.ipAddress ?? null,
    });

    // On ne bloque jamais l'action métier principale si la journalisation échoue :
    // on logue l'erreur côté serveur sans la propager (le RDV, lui, a bien été créé).
    if (error) {
      console.error('[SupabaseAuditLogger] Échec d\'écriture du journal d\'audit :', error.message);
    }
  }
}
