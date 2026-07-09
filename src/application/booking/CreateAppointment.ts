// src/application/booking/CreateAppointment.ts
import { Appointment, AppointmentStatus } from '@/domain/appointment/Appointment';
import type { AppointmentRepository } from '@/domain/appointment/AppointmentRepository';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import { SlotStatus } from '@/domain/slot/Slot';
import type { EmailProvider } from '@/domain/shared/EmailProvider';
import { EmailType } from '@/domain/shared/EmailProvider';
import type { AuditLogger } from '@/domain/shared/AuditLogger';
import { AuditAction, ActorRole } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';

export type CreateAppointmentInput = {
  slotId: string;
  serviceId: string;
  subServiceId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string;
};

/**
 * Use case : un visiteur réserve un créneau.
 *
 * Toutes les dépendances sont des interfaces (Dependency Inversion) — ce use case
 * ignore totalement Supabase. Il est injecté depuis le composition root (src/app/).
 */
export class CreateAppointment {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly slotRepository: SlotRepository,
    private readonly emailProvider: EmailProvider,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(input: CreateAppointmentInput): Promise<Appointment> {
    const slot = await this.slotRepository.findById(input.slotId);
    if (!slot) {
      throw new DomainError('Créneau introuvable.', 'SLOT_NOT_FOUND');
    }
    if (!slot.canBeBooked()) {
      throw new DomainError('Ce créneau vient d\'être réservé ou n\'est plus disponible.', 'SLOT_UNAVAILABLE');
    }

    const draft = new Appointment(
      '', // généré par le repository
      slot.id,
      input.serviceId,
      input.clientEmail,
      input.clientName,
      input.clientPhone,
      AppointmentStatus.PENDING,
      new Date(),
    );

    const appointment = await this.appointmentRepository.save(draft);

    // Mise à jour atomique du créneau : l'implémentation Supabase (étape 6) fait
    // un UPDATE conditionnel (WHERE status = 'available') pour parer une course
    // entre deux visiteurs cliquant sur le même créneau au même instant.
    await this.slotRepository.updateStatus(slot.id, SlotStatus.BOOKED);

    await this.emailProvider.send({
      to: appointment.clientEmail,
      subject: 'Confirmation de votre rendez-vous',
      type: EmailType.APPOINTMENT_CONFIRMATION,
      data: { appointment },
    });

    await this.auditLogger.log({
      actorId: null,
      actorRole: ActorRole.CLIENT,
      action: AuditAction.APPOINTMENT_CREATED,
      targetType: 'appointment',
      targetId: appointment.id,
    });

    return appointment;
  }
}
