// src/lib/auth/recordAuthEvent.ts
import { RecordAuthEvent, type RecordAuthEventInput } from '@/application/audit/RecordAuthEvent';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';

/**
 * Trace un événement d'authentification depuis une Server Action (composition root).
 *
 * Ne lève jamais : une panne du journal ne doit ni empêcher une connexion légitime
 * ni masquer un échec de connexion derrière une autre erreur.
 */
export async function recordAuthEvent(input: RecordAuthEventInput): Promise<void> {
  try {
    await new RecordAuthEvent(new SupabaseAuditLogger()).execute(input);
  } catch (error) {
    console.error("[recordAuthEvent] Événement d'authentification non journalisé :", error);
  }
}
