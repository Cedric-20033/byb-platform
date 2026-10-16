// src/application/booking/CreateAppointment.ts
import { Appointment, AppointmentStatus } from '@/domain/appointment/Appointment';
import { DEFAULT_APPOINTMENT_LOCALE, type AppointmentLocale } from '@/domain/appointment/AppointmentLocale';
import type { AppointmentRepository } from '@/domain/appointment/AppointmentRepository';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import { SlotStatus } from '@/domain/slot/Slot';
import { assertSlotBookable, DEFAULT_BOOKING_POLICY, type BookingPolicy } from '@/domain/booking/BookingPolicy';
import { systemClock, type Clock } from '@/domain/shared/Clock';
import type { EmailProvider } from '@/domain/shared/EmailProvider';
import { EmailType } from '@/domain/shared/EmailProvider';
import type { AuditLogger } from '@/domain/shared/AuditLogger';
import { AuditAction, ActorRole } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import { toIsoDate } from '@/domain/shared/IsoDate';

export type CreateAppointmentInput = {
  slotId: string;
  serviceId: string;
  subServiceId?: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes?: string;
  /** Langue du visiteur : celle de ses emails. Absente : français. */
  locale?: AppointmentLocale;
};

/**
 * Use case : un visiteur réserve un créneau.
 *
 * Toutes les dépendances sont des interfaces (Dependency Inversion) — ce use case ignore totalement
 * Supabase. Il est injecté depuis le composition root (src/app/).
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
    private readonly policy: BookingPolicy = DEFAULT_BOOKING_POLICY,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(input: CreateAppointmentInput): Promise<Appointment> {
    const slot = await this.slotRepository.findById(input.slotId);
    if (!slot) {
      throw new DomainError('Créneau introuvable.', 'SLOT_NOT_FOUND');
    }
    // Le service vient du formulaire : sans ce contrôle, un appel direct pourrait réserver
    // le créneau d'une prestation en se déclarant pour une autre.
    if (!slot.canBeBooked() || slot.serviceId !== input.serviceId) {
      throw new DomainError('Ce créneau vient d\'être réservé ou n\'est plus disponible.', 'SLOT_UNAVAILABLE');
    }

    const now = this.clock.now();
    assertSlotBookable({ date: slot.date, startTime: slot.range.startTime }, now, this.policy);

    // Emails comparés en minuscules : « Alice@x.be » et « alice@x.be » sont la même personne.
    const clientEmail = input.clientEmail.trim().toLowerCase();
    const upcoming = await this.appointmentRepository.countUpcomingByEmail(clientEmail, toIsoDate(now));
    if (upcoming >= this.policy.maxUpcomingPerEmail) {
      throw new DomainError('Trop de rendez-vous à venir pour cette adresse.', 'BOOKING_LIMIT_REACHED');
    }

    const draft = new Appointment(
      '', // généré par le repository
      slot.id,
      input.serviceId,
      input.subServiceId ?? null,
      clientEmail,
      input.clientName,
      input.clientPhone,
      input.notes ?? null,
      AppointmentStatus.PENDING,
      now,
      input.locale ?? DEFAULT_APPOINTMENT_LOCALE,
    );

    const appointment = await this.appointmentRepository.save(draft);

    // Mise à jour atomique du créneau : l'implémentation Supabase fait un UPDATE conditionnel
    // (WHERE status = 'available') pour parer une course entre deux visiteurs cliquant sur le même
    // créneau au même instant ; l'index unique partiel des rendez-vous actifs reste l'arbitre final.
    await this.slotRepository.updateStatus(slot.id, SlotStatus.BOOKED);

    await this.emailProvider.send({
      to: appointment.clientEmail,
      type: EmailType.APPOINTMENT_CONFIRMATION,
      data: { appointment },
    });

    // Notifie l'entreprise qu'une nouvelle demande attend une confirmation —
    // sans ça, un RDV `pending` pouvait rester indéfiniment invisible tant
    // qu'un admin ne pensait pas à ouvrir le dashboard.
    await this.emailProvider.send({
      to: this.adminNotificationEmail,
      type: EmailType.ADMIN_NEW_APPOINTMENT,
      data: { appointment, slotDate: slot.date, slotStartTime: slot.range.startTime },
      locale: 'fr',
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
