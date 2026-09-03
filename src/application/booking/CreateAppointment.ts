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
    /**
     * Adresse de l'entreprise à notifier à chaque nouvelle demande de RDV.
     * Fournie par le composition root (Server Action) — ce use case ne sait
     * pas d'où elle vient (data/company.ts, variable d'environnement, etc.).
     */
    private readonly adminNotificationEmail: string,
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
      input.subServiceId ?? null,
      input.clientEmail,
      input.clientName,
      input.clientPhone,
      input.notes ?? null,
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
      subject: 'Votre demande de rendez-vous a bien été reçue',
      type: EmailType.APPOINTMENT_CONFIRMATION,
      data: { appointment },
    });

    // Notifie l'entreprise qu'une nouvelle demande attend une confirmation —
    // sans ça, un RDV `pending` pouvait rester indéfiniment invisible tant
    // qu'un admin ne pensait pas à ouvrir le dashboard.
    await this.emailProvider.send({
      to: this.adminNotificationEmail,
      subject: 'Nouveau rendez-vous en attente de confirmation',
      type: EmailType.ADMIN_NEW_APPOINTMENT,
      data: { appointment, slotDate: slot.date, slotStartTime: slot.range.startTime },
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
