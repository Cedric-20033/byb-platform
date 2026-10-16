// src/application/admin/CreateAppointmentByAdmin.ts
import type { Appointment } from '@/domain/appointment/Appointment';
import type { AdminAppointmentBooker, SlotSelection } from '@/domain/appointment/AdminAppointmentBooker';
import { SlotStatus } from '@/domain/slot/Slot';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import type { AuditLogger } from '@/domain/shared/AuditLogger';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { systemClock, type Clock } from '@/domain/shared/Clock';
import { DomainError } from '@/domain/shared/DomainError';
import { EmailType, type EmailProvider } from '@/domain/shared/EmailProvider';
import { toIsoDate } from '@/domain/shared/IsoDate';
import { TimeRange } from '@/domain/shared/TimeRange';

export type CreateAppointmentByAdminInput = {
  serviceId: string;
  subServiceId?: string | null;
  slot: SlotSelection;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string | null;
  actorId: string;
  actorRole: ActorRole;
};

/** Créneau effectif du rendez-vous, utilisé pour l'audit une fois la réservation faite. */
type ResolvedSlot = { date: string; startTime: string; endTime: string; adHoc: boolean };

/**
 * Use case : un admin prend un rendez-vous pour un client (appel téléphonique, passage sur place…).
 *
 * Différences avec la réservation publique (CreateAppointment) :
 *  - le rendez-vous naît directement `confirmed` : l'équipe n'a pas à se valider elle-même ;
 *  - le créneau peut être un créneau libre existant OU un créneau ponctuel créé pour l'occasion ;
 *  - la réservation du créneau et la création du rendez-vous sont atomiques (port `AdminAppointmentBooker`).
 */
export class CreateAppointmentByAdmin {
  constructor(
    private readonly booker: AdminAppointmentBooker,
    private readonly slotRepository: SlotRepository,
    private readonly emailProvider: EmailProvider,
    private readonly auditLogger: AuditLogger,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(input: CreateAppointmentByAdminInput): Promise<Appointment> {
    const slot = await this.resolveSlot(input, toIsoDate(this.clock.now()));

    const appointment = await this.booker.bookConfirmed({
      serviceId: input.serviceId,
      subServiceId: input.subServiceId ?? null,
      slot: input.slot,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      notes: input.notes ?? null,
    });

    // Le rendez-vous est déjà confirmé : le client reçoit directement le courrier de confirmation.
    await this.emailProvider.send({
      to: appointment.clientEmail,
      type: EmailType.APPOINTMENT_CONFIRMED_BY_ADMIN,
      data: { appointment },
    });

    await this.auditLogger.log({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: AuditAction.APPOINTMENT_CREATED_BY_ADMIN,
      targetType: 'appointment',
      targetId: appointment.id,
      metadata: {
        adHocSlot: slot.adHoc,
        slotDate: slot.date,
        slotStartTime: slot.startTime,
        slotEndTime: slot.endTime,
      },
    });

    return appointment;
  }

  /**
   * Vérifie les règles métier AVANT de tenter la réservation, pour renvoyer une erreur précise.
   * La base reste l'arbitre en cas de course (UPDATE conditionnel et contraintes d'unicité).
   */
  private async resolveSlot(input: CreateAppointmentByAdminInput, today: string): Promise<ResolvedSlot> {
    if (input.slot.kind === 'existing') {
      const slot = await this.slotRepository.findById(input.slot.slotId);
      if (!slot) throw new DomainError('Créneau introuvable.', 'SLOT_NOT_FOUND');

      // Un créneau d'un autre service n'est pas « introuvable » mais n'est pas réservable ici.
      if (!slot.canBeBooked() || slot.serviceId !== input.serviceId) {
        throw new DomainError("Ce créneau n'est pas disponible pour ce service.", 'SLOT_UNAVAILABLE');
      }
      this.assertNotInPast(slot.date, today);

      return { date: slot.date, startTime: slot.range.startTime, endTime: slot.range.endTime, adHoc: false };
    }

    const { date, startTime, endTime } = input.slot;
    this.assertNotInPast(date, today);
    await this.assertNoOverlap(input.serviceId, date, new TimeRange(startTime, endTime));

    return { date, startTime, endTime, adHoc: true };
  }

  /** Comparaison de dates calendaires « AAAA-MM-JJ » : l'ordre lexicographique est l'ordre chronologique. */
  private assertNotInPast(date: string, today: string): void {
    if (date < today) throw new DomainError('Ce créneau est déjà passé.', 'SLOT_IN_PAST');
  }

  /**
   * Un créneau ponctuel ne doit pas empiéter sur un autre créneau du même service : il resterait
   * réservable à côté d'un rendez-vous déjà pris. Un créneau bloqué n'est pas réservable, le
   * recouvrir est donc une décision volontaire de l'admin et reste permis.
   */
  private async assertNoOverlap(serviceId: string, date: string, requested: TimeRange): Promise<void> {
    const sameDaySlots = await this.slotRepository.findByDate(date);

    const overlaps = sameDaySlots.some(
      (slot) =>
        slot.serviceId === serviceId &&
        slot.status !== SlotStatus.BLOCKED &&
        // La base renvoie « HH:mm:ss », la saisie « HH:mm » : comparées telles quelles, des plages
        // simplement contiguës (10:00 / 10:00:00) paraîtraient se chevaucher. On compare à la minute.
        requested.overlaps(new TimeRange(slot.range.startTime.slice(0, 5), slot.range.endTime.slice(0, 5))),
    );

    if (overlaps) throw new DomainError('Cette plage chevauche un autre créneau du service.', 'SLOT_OVERLAP');
  }
}
