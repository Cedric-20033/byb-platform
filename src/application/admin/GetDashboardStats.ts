// src/application/admin/GetDashboardStats.ts
import type { AppointmentRepository } from '@/domain/appointment/AppointmentRepository';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import { SlotStatus } from '@/domain/slot/Slot';
import { AppointmentStatus } from '@/domain/appointment/Appointment';

export type DailyAppointmentCount = { date: string; count: number };

export type DashboardStats = {
  appointmentsToday: number;
  appointmentsThisWeek: number;
  pendingCount: number;
  blockedSlotsToday: number;
  /** Nombre de RDV par jour sur 14 jours (semaine en cours + semaine suivante), pour le graphique du dashboard. */
  last14Days: DailyAppointmentCount[];
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Début (lundi) de la semaine ISO contenant `date`.
 */
function startOfIsoWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

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
 * exclurait donc systématiquement les vrais rendez-vous — c'était le bug
 * initial (RDV confirmé pour un jour à venir, jamais compté).
 */
export class GetDashboardStats {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly slotRepository: SlotRepository,
  ) {}

  async execute(): Promise<DashboardStats> {
    const today = new Date();
    const todayIso = toIsoDate(today);

    const weekStart = startOfIsoWeek(today);
    const weekStartIso = toIsoDate(weekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndIso = toIsoDate(weekEnd);

    // Fenêtre de 14 jours à partir du lundi de la semaine en cours (semaine
    // actuelle + semaine suivante) — englobe toujours "aujourd'hui" et "cette semaine".
    const rangeStart = weekStart;
    const rangeEnd = new Date(weekStart);
    rangeEnd.setDate(rangeEnd.getDate() + 13);
    const rangeEndIso = toIsoDate(rangeEnd);

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
      const date = new Date(rangeStart);
      date.setDate(date.getDate() + index);
      const iso = toIsoDate(date);
      return { date: iso, count: countByDate.get(iso) ?? 0 };
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
