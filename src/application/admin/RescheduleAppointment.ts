// src/application/admin/RescheduleAppointment.ts
import type { AppointmentRepository } from '@/domain/appointment/AppointmentRepository';
import type { AppointmentRescheduler } from '@/domain/appointment/AppointmentRescheduler';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import { ActorRole, AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import { systemClock, type Clock } from '@/domain/shared/Clock';
import { DomainError } from '@/domain/shared/DomainError';
import { EmailType, type EmailProvider } from '@/domain/shared/EmailProvider';
import { toIsoDate } from '@/domain/shared/IsoDate';

export type RescheduleAppointmentInput = {
  appointmentId: string;
  newSlotId: string;
  /** null quand le client déplace lui-même son rendez-vous via le lien de son email. */
  actorId: string | null;
  actorRole: ActorRole;
};

/**
 * Use case : un admin (ou, via `RescheduleAppointmentByClient`, le client) déplace un rendez-vous actif
 * vers un autre créneau libre du même service.
 *
 * Le déplacement (réserver le nouveau créneau, libérer l'ancien, mettre à jour le rendez-vous) est
 * atomique : il est délégué au port `AppointmentRescheduler`. Le statut du rendez-vous ne change pas :
 * un rendez-vous confirmé reste confirmé. Le client est prévenu par email.
 */
export class RescheduleAppointment {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly slotRepository: SlotRepository,
    private readonly rescheduler: AppointmentRescheduler,
    private readonly emailProvider: EmailProvider,
    private readonly auditLogger: AuditLogger,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(input: RescheduleAppointmentInput): Promise<void> {
    const appointment = await this.appointmentRepository.findById(input.appointmentId);
    if (!appointment) throw new DomainError('Rendez-vous introuvable.', 'APPOINTMENT_NOT_FOUND');
    if (!appointment.isActive()) {
      throw new DomainError('Un rendez-vous annulé ne peut pas être déplacé.', 'INVALID_STATUS_TRANSITION');
    }

    const target = await this.slotRepository.findById(input.newSlotId);
    if (!target) throw new DomainError('Créneau introuvable.', 'SLOT_NOT_FOUND');

    // Même créneau, créneau déjà pris ou d'un autre service : dans les trois cas il n'est pas réservable ici.
    if (target.id === appointment.slotId || !target.canBeBooked() || target.serviceId !== appointment.serviceId) {
      throw new DomainError("Ce créneau n'est pas disponible pour ce rendez-vous.", 'SLOT_UNAVAILABLE');
    }
    if (target.date < toIsoDate(this.clock.now())) {
      throw new DomainError('Ce créneau est déjà passé.', 'SLOT_IN_PAST');
    }

    // Lu avant le déplacement : après, l'ancien créneau est libre et n'a plus de lien avec ce rendez-vous.
    const previous = await this.slotRepository.findById(appointment.slotId);

    await this.rescheduler.reschedule(appointment.id, target.id);

    await this.emailProvider.send({
      to: appointment.clientEmail,
      type: EmailType.APPOINTMENT_RESCHEDULED,
      data: {
        appointment,
        previousSlot: previous
          ? { date: previous.date, startTime: previous.range.startTime, endTime: previous.range.endTime }
          : null,
        newSlot: { date: target.date, startTime: target.range.startTime, endTime: target.range.endTime },
      },
    });

    // Diff avant/après sans donnée personnelle : le journal est immuable.
    await this.auditLogger.log({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: AuditAction.APPOINTMENT_RESCHEDULED,
      targetType: 'appointment',
      targetId: appointment.id,
      metadata: {
        slotDate: { from: previous?.date ?? null, to: target.date },
        slotStartTime: { from: previous?.range.startTime ?? null, to: target.range.startTime },
        slotEndTime: { from: previous?.range.endTime ?? null, to: target.range.endTime },
      },
    });
  }
}
