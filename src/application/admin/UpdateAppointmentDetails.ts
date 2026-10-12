// src/application/admin/UpdateAppointmentDetails.ts
import type { AppointmentContactDetails, AppointmentRepository } from '@/domain/appointment/AppointmentRepository';
import { ActorRole, AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';

export type UpdateAppointmentDetailsInput = {
  appointmentId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string | null;
  actorId: string;
  actorRole: ActorRole;
};

/**
 * Use case : un admin corrige les coordonnées ou les notes d'un rendez-vous actif.
 *
 * Aucun email : corriger une faute de frappe ne regarde pas le client (le déplacement, lui, le prévient).
 * L'audit liste les CHAMPS modifiés mais jamais leurs valeurs : le journal est immuable, y copier des
 * noms, emails ou téléphones rendrait impossible leur effacement (droit à l'effacement du RGPD).
 */
export class UpdateAppointmentDetails {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(input: UpdateAppointmentDetailsInput): Promise<void> {
    const appointment = await this.appointmentRepository.findById(input.appointmentId);
    if (!appointment) throw new DomainError('Rendez-vous introuvable.', 'APPOINTMENT_NOT_FOUND');
    if (!appointment.isActive()) {
      throw new DomainError('Un rendez-vous annulé ne peut plus être modifié.', 'INVALID_STATUS_TRANSITION');
    }

    // Les espaces de bord et une note vide ne sont pas des modifications : on normalise avant de comparer.
    const next: AppointmentContactDetails = {
      clientName: input.clientName.trim(),
      clientEmail: input.clientEmail.trim(),
      clientPhone: input.clientPhone.trim(),
      notes: input.notes?.trim() || null,
    };

    const changedFields = (Object.keys(next) as (keyof AppointmentContactDetails)[]).filter(
      (field) => next[field] !== appointment[field],
    );
    if (changedFields.length === 0) return;

    await this.appointmentRepository.updateDetails(appointment.id, next);

    await this.auditLogger.log({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: AuditAction.APPOINTMENT_UPDATED,
      targetType: 'appointment',
      targetId: appointment.id,
      metadata: { changedFields },
    });
  }
}
