// src/application/admin/GetAppointmentInsights.ts
import type { AppointmentRepository } from '@/domain/appointment/AppointmentRepository';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { systemClock, type Clock } from '@/domain/shared/Clock';
import { addDays, toIsoDate } from '@/domain/shared/IsoDate';

/** Jours couverts avant et après aujourd'hui (inclus) : 30 jours passés et 30 à venir. */
export const INSIGHTS_PAST_DAYS = 30;
export const INSIGHTS_FUTURE_DAYS = 30;

export type ServiceActivity = { serviceId: string; count: number };

export type AppointmentInsights = {
  /** Bornes de la période analysée (jours calendaires belges, inclus). */
  from: string;
  to: string;
  total: number;
  cancelled: number;
  /** Part des rendez-vous annulés, entre 0 et 1 ; `null` quand la période ne contient aucun rendez-vous. */
  cancellationRate: number | null;
  /** Rendez-vous non annulés par service, du plus demandé au moins demandé. */
  byService: ServiceActivity[];
};

/**
 * Use case : taux d'annulation et répartition par service, pour le dashboard.
 *
 * La période est centrée sur aujourd'hui (30 jours passés, 30 à venir) et se rapporte à la DATE DU CRÉNEAU.
 * Une fenêtre uniquement passée resterait vide pendant un mois sur un site récent, puisque les clients
 * réservent à l'avance. Les rendez-vous annulés comptent dans le taux mais pas dans la répartition :
 * celle-ci mesure la demande réellement servie.
 */
export class GetAppointmentInsights {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(): Promise<AppointmentInsights> {
    const today = toIsoDate(this.clock.now());
    const from = addDays(today, -(INSIGHTS_PAST_DAYS - 1));
    const to = addDays(today, INSIGHTS_FUTURE_DAYS);

    const appointments = await this.appointmentRepository.searchWithSlot({ dateFrom: from, dateTo: to });

    const countByService = new Map<string, number>();
    let cancelled = 0;
    for (const { appointment } of appointments) {
      if (appointment.status === AppointmentStatus.CANCELLED) {
        cancelled++;
        continue;
      }
      countByService.set(appointment.serviceId, (countByService.get(appointment.serviceId) ?? 0) + 1);
    }

    const byService = [...countByService]
      .map(([serviceId, count]) => ({ serviceId, count }))
      // Départage par identifiant : l'ordre du graphique reste stable d'un rafraîchissement à l'autre.
      .sort((a, b) => b.count - a.count || a.serviceId.localeCompare(b.serviceId));

    const total = appointments.length;
    return { from, to, total, cancelled, cancellationRate: total === 0 ? null : cancelled / total, byService };
  }
}
