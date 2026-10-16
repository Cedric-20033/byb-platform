// src/application/booking/RescheduleAppointmentByClient.ts
import { ActorRole } from '@/domain/shared/AuditLogger';
import { systemClock, type Clock } from '@/domain/shared/Clock';
import { DomainError } from '@/domain/shared/DomainError';
import { EmailType, type EmailProvider } from '@/domain/shared/EmailProvider';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import { assertSlotBookable, DEFAULT_BOOKING_POLICY, type BookingPolicy } from '@/domain/booking/BookingPolicy';
import type { GetClientAppointment } from './GetClientAppointment';
import { requireActiveClientAppointment } from './requireActiveClientAppointment';
import type { RescheduleAppointment } from '@/application/admin/RescheduleAppointment';

export type RescheduleAppointmentByClientInput = {
  token: string;
  newSlotId: string;
};

/**
 * Use case : un client choisit un autre créneau pour son rendez-vous, depuis le lien de son email.
 *
 * Le déplacement est celui de l'admin (`RescheduleAppointment` : atomique, même service, créneau libre,
 * email au client, audit avec l'acteur « client »). S'y ajoutent les règles de la réservation publique :
 * un client ne peut pas se placer sur un créneau trop proche ou hors de l'horizon ouvert, ni déplacer
 * un rendez-vous déjà passé ou annulé.
 *
 * Le statut ne change pas : un rendez-vous confirmé reste confirmé, l'équipe est simplement prévenue.
 */
export class RescheduleAppointmentByClient {
  constructor(
    private readonly getClientAppointment: GetClientAppointment,
    private readonly slotRepository: SlotRepository,
    private readonly rescheduleAppointment: RescheduleAppointment,
    private readonly emailProvider: EmailProvider,
    private readonly adminNotificationEmail: string,
    private readonly policy: BookingPolicy = DEFAULT_BOOKING_POLICY,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(input: RescheduleAppointmentByClientInput): Promise<void> {
    const view = await requireActiveClientAppointment(this.getClientAppointment, input.token);

    const target = await this.slotRepository.findById(input.newSlotId);
    if (!target) throw new DomainError('Créneau introuvable.', 'SLOT_NOT_FOUND');
    assertSlotBookable({ date: target.date, startTime: target.range.startTime }, this.clock.now(), this.policy);

    await this.rescheduleAppointment.execute({
      appointmentId: view.appointment.id,
      newSlotId: target.id,
      actorId: null,
      actorRole: ActorRole.CLIENT,
    });

    await this.emailProvider.send({
      to: this.adminNotificationEmail,
      type: EmailType.ADMIN_APPOINTMENT_RESCHEDULED_BY_CLIENT,
      data: {
        appointment: view.appointment,
        previousSlot: { date: view.slot.date, startTime: view.slot.startTime, endTime: view.slot.endTime },
        newSlot: { date: target.date, startTime: target.range.startTime, endTime: target.range.endTime },
      },
      locale: 'fr',
    });
  }
}
