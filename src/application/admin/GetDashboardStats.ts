// src/application/admin/GetDashboardStats.ts
import type { AppointmentRepository } from '@/domain/appointment/AppointmentRepository';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import { SlotStatus } from '@/domain/slot/Slot';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { systemClock, type Clock } from '@/domain/shared/Clock';
import { addDays, startOfIsoWeek, toIsoDate } from '@/domain/shared/IsoDate';

export type DailyAppointmentCount = { date: string; count: number };

export type DashboardStats = {
  appointmentsToday: number;
  appointmentsThisWeek: number;
  pendingCount: number;
  blockedSlotsToday: number;
  /** Nombre de RDV par jour sur 14 jours (semaine en cours + semaine suivante), pour le graphique du dashboard. */
  last14Days: DailyAppointmentCount[];
};

/**
 * Use case : agrège les indicateurs affichés sur la page d'accueil du dashboard.
 * Une seule requête large sert de base à la fois au compteur "aujourd'hui",
 * au compteur "cette semaine" et au graphique — évite de multiplier les
 * allers-retours réseau pour un même écran.
 *
 * Fenêtre de calcul : semaine en cours (lundi à dimanche) + semaine suivante,
 * soit 14 jours à partir du lundi de la semaine en cours. Les RDV pris via
 * l'assistant de réservation sont toujours dans le futur (impossible de
 * choisir un créneau passé) : une fenêtre qui s'arrêterait à "aujourd'hui"
 * exclurait donc systématiquement les vrais rendez-vous.
 *
 * "Aujourd'hui" est le jour calendaire belge de l'horloge injectée : il ne
 * dépend ni du fuseau du serveur ni de celui du navigateur.
 */
export class GetDashboardStats {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly slotRepository: SlotRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(): Promise<DashboardStats> {
    const todayIso = toIsoDate(this.clock.now());
    const weekStartIso = startOfIsoWeek(todayIso);
    const weekEndIso = addDays(weekStartIso, 6);
    const rangeEndIso = addDays(weekStartIso, 13);

    const [rangeAppointments, pendingAppointments, todaySlots] = await Promise.all([
      this.appointmentRepository.searchWithSlot({ dateFrom: weekStartIso, dateTo: rangeEndIso }),
      this.appointmentRepository.search({ status: AppointmentStatus.PENDING }),
      this.slotRepository.findByDate(todayIso),
    ]);

    // Construit les 14 jours dans l'ordre chronologique, y compris ceux à zéro RDV,
    // pour que le graphique ne saute pas de jour.
    const countByDate = new Map<string, number>();
    for (const { slotDate } of rangeAppointments) {
      countByDate.set(slotDate, (countByDate.get(slotDate) ?? 0) + 1);
    }
    const last14Days: DailyAppointmentCount[] = Array.from({ length: 14 }, (_, index) => {
      const date = addDays(weekStartIso, index);
      return { date, count: countByDate.get(date) ?? 0 };
    });

    return {
      appointmentsToday: countByDate.get(todayIso) ?? 0,
      appointmentsThisWeek: rangeAppointments.filter((a) => a.slotDate >= weekStartIso && a.slotDate <= weekEndIso)
        .length,
      pendingCount: pendingAppointments.length,
      blockedSlotsToday: todaySlots.filter((slot) => slot.status === SlotStatus.BLOCKED).length,
      last14Days,
    };
  }
}
