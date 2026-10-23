// src/application/admin/GetAppointmentHistory.ts
import type { AuditLogEntry } from '@/domain/audit/AuditLogEntry';
import type { AuditLogReader } from '@/domain/audit/AuditLogReader';

/**
 * Borne de sécurité : un rendez-vous ne vit que quelques événements (demande,
 * confirmation, annulation, replanifications…). Le plafond évite qu'une cible
 * anormalement bavarde ne rapatrie une page entière du journal.
 */
const HISTORY_LIMIT = 100;

/**
 * Use case (lecture seule) : l'historique d'un rendez-vous, c'est-à-dire les entrées
 * du journal d'audit dont la cible est ce rendez-vous.
 *
 * Le lecteur renvoie du plus récent au plus ancien ; on inverse pour obtenir une
 * chronologie qui se lit de haut en bas (demande → confirmation → …).
 * Ce use case ne s'auto-trace pas : lire l'historique ne modifie aucun état.
 */
export class GetAppointmentHistory {
  constructor(private readonly auditLogReader: AuditLogReader) {}

  async execute(appointmentId: string): Promise<AuditLogEntry[]> {
    const { entries } = await this.auditLogReader.search(
      { targetType: 'appointment', targetId: appointmentId },
      { limit: HISTORY_LIMIT, after: null },
    );
    return [...entries].reverse();
  }
}
