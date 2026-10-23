// src/application/admin/GetUpcomingAppointments.ts
import type { AppointmentRepository } from '@/domain/appointment/AppointmentRepository';
import type { AppointmentWithSlot } from '@/domain/appointment/AppointmentWithSlot';
import { systemClock, type Clock } from '@/domain/shared/Clock';
import { addDays, toIsoDate, wallClockToInstant } from '@/domain/shared/IsoDate';

export const UPCOMING_APPOINTMENTS_LIMIT = 6;
/** Fenêtre de recherche : au-delà, la liste complète et le calendrier prennent le relais. */
export const UPCOMING_HORIZON_DAYS = 30;

/**
 * Use case : prochains rendez-vous actifs (en attente ou confirmés), du plus proche au plus lointain,
 * pour le widget « Prochains rendez-vous » du dashboard.
 *
 * Le critère est l'HEURE DE FIN du créneau, pas son jour : un rendez-vous commencé il y a dix minutes est
 * encore « en cours » et reste affiché, alors qu'un créneau terminé ce matin ne l'est plus. Le filtre de
 * période du dépôt travaille au jour près, l'affinage à l'heure se fait donc ici, en heure belge.
 */
export class GetUpcomingAppointments {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(limit: number = UPCOMING_APPOINTMENTS_LIMIT): Promise<AppointmentWithSlot[]> {
    const now = this.clock.now();
    const today = toIsoDate(now);

    const candidates = await this.appointmentRepository.searchWithSlot({
      dateFrom: today,
      dateTo: addDays(today, UPCOMING_HORIZON_DAYS),
    });

    return candidates
      .filter(
        ({ appointment, slotDate, slotEndTime }) =>
          appointment.isActive() && wallClockToInstant(slotDate, slotEndTime).getTime() > now.getTime(),
      )
      .sort(
        (a, b) =>
          `${a.slotDate} ${a.slotStartTime}`.localeCompare(`${b.slotDate} ${b.slotStartTime}`) ||
          a.appointment.id.localeCompare(b.appointment.id),
      )
      .slice(0, limit);
  }
}
