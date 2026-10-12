// src/application/admin/DeleteAppointment.ts
import type { AppointmentRemover } from '@/domain/appointment/AppointmentRemover';
import type { AppointmentRepository } from '@/domain/appointment/AppointmentRepository';
import { ActorRole, AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';

export type DeleteAppointmentInput = {
  appointmentId: string;
  actorId: string;
  actorRole: ActorRole;
};

/**
 * Use case : suppression définitive d'un rendez-vous (erreur de saisie, doublon, demande d'effacement).
 *
 * Pour retirer un rendez-vous qui a eu lieu ou dont on veut garder la trace, l'annuler suffit : la
 * suppression ne laisse que l'entrée d'audit. Le créneau d'un rendez-vous actif est libéré dans la
 * même transaction (port `AppointmentRemover`). Aucun email : le client n'est pas prévenu.
 */
export class DeleteAppointment {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly remover: AppointmentRemover,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(input: DeleteAppointmentInput): Promise<void> {
    const appointment = await this.appointmentRepository.findById(input.appointmentId);
    if (!appointment) throw new DomainError('Rendez-vous introuvable.', 'APPOINTMENT_NOT_FOUND');

    await this.remover.remove(appointment.id);

    await this.auditLogger.log({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: AuditAction.APPOINTMENT_DELETED,
      targetType: 'appointment',
      targetId: appointment.id,
      metadata: { status: appointment.status, slotFreed: appointment.isActive() },
    });
  }
}
