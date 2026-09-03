// src/application/booking/CancelAppointment.ts
import { AppointmentStatus } from "@/domain/appointment/Appointment";
import type { AppointmentRepository } from "@/domain/appointment/AppointmentRepository";
import type { SlotRepository } from "@/domain/slot/SlotRepository";
import { SlotStatus } from "@/domain/slot/Slot";
import type { EmailProvider } from "@/domain/shared/EmailProvider";
import { EmailType } from "@/domain/shared/EmailProvider";
import type { AuditLogger } from "@/domain/shared/AuditLogger";
import { AuditAction, ActorRole } from "@/domain/shared/AuditLogger";
import { DomainError } from "@/domain/shared/DomainError";

export type CancelAppointmentInput = {
  appointmentId: string;
  /** null si annulation par le client via son lien token (voir RPC Supabase) */
  actorId: string | null;
  actorRole: ActorRole;
  /** Message optionnel expliqué au client dans l'email d'annulation (annulation admin). */
  reason?: string | null;
};

/**
 * Use case : annulation d'un rendez-vous, par le client (via token) ou un admin.
 * Libère systématiquement le créneau associé.
 */
export class CancelAppointment {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly slotRepository: SlotRepository,
    private readonly emailProvider: EmailProvider,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(input: CancelAppointmentInput): Promise<void> {
    const appointment = await this.appointmentRepository.findById(
      input.appointmentId,
    );
    if (!appointment) {
      throw new DomainError(
        "Rendez-vous introuvable.",
        "APPOINTMENT_NOT_FOUND",
      );
    }

    // Délègue la règle métier de transition à l'entité elle-même (pas de duplication ici).
    try {
      appointment.assertCanTransitionTo(AppointmentStatus.CANCELLED);
    } catch {
      throw new DomainError(
        "Ce rendez-vous ne peut plus être annulé.",
        "INVALID_STATUS_TRANSITION",
      );
    }

    await this.appointmentRepository.updateStatus(
      appointment.id,
      AppointmentStatus.CANCELLED,
    );
    await this.slotRepository.updateStatus(
      appointment.slotId,
      SlotStatus.AVAILABLE,
    );

    await this.emailProvider.send({
      to: appointment.clientEmail,
      subject: "Annulation de votre rendez-vous",
      type: EmailType.APPOINTMENT_CANCELLATION,
      data: { appointment, reason: input.reason ?? null },
    });

    await this.auditLogger.log({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: AuditAction.APPOINTMENT_CANCELLED,
      targetType: "appointment",
      targetId: appointment.id,
      metadata: input.reason ? { reason: input.reason } : undefined,
    });
  }
}
