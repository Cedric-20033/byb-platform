// src/application/admin/ConfirmAppointment.ts
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import type { AppointmentRepository } from '@/domain/appointment/AppointmentRepository';
import type { EmailProvider } from '@/domain/shared/EmailProvider';
import { EmailType } from '@/domain/shared/EmailProvider';
import type { AuditLogger } from '@/domain/shared/AuditLogger';
import { AuditAction, ActorRole } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';

export type ConfirmAppointmentInput = {
  appointmentId: string;
  actorId: string;
  actorRole: ActorRole;
};

/**
 * Use case : un admin ou le superadmin confirme un rendez-vous en attente.
 *
 * Symétrique à CancelAppointment — même structure, mais ne touche pas au
 * créneau : celui-ci reste `booked`, il l'était déjà depuis la création
 * du rendez-vous (voir CreateAppointment). Seul le statut du RDV change.
 */
export class ConfirmAppointment {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly emailProvider: EmailProvider,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(input: ConfirmAppointmentInput): Promise<void> {
    const appointment = await this.appointmentRepository.findById(input.appointmentId);
    if (!appointment) {
      throw new DomainError('Rendez-vous introuvable.', 'APPOINTMENT_NOT_FOUND');
    }

    // Délègue la règle métier de transition à l'entité elle-même (pas de duplication ici) —
    // échoue si le RDV n'est pas en attente (déjà confirmé ou annulé).
    try {
      appointment.assertCanTransitionTo(AppointmentStatus.CONFIRMED);
    } catch {
      throw new DomainError(
        "Ce rendez-vous ne peut pas être confirmé (il n'est plus en attente).",
        'INVALID_STATUS_TRANSITION',
      );
    }

    await this.appointmentRepository.updateStatus(appointment.id, AppointmentStatus.CONFIRMED);

    await this.emailProvider.send({
      to: appointment.clientEmail,
      type: EmailType.APPOINTMENT_CONFIRMED_BY_ADMIN,
      data: { appointment },
    });

    await this.auditLogger.log({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: AuditAction.APPOINTMENT_CONFIRMED,
      targetType: 'appointment',
      targetId: appointment.id,
    });
  }
}
