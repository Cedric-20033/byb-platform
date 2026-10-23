// src/components/admin/slotsWeek.ts
import { addDays } from '@/domain/shared/IsoDate';
import { SlotStatus } from '@/domain/slot/Slot';

/** Le strict nécessaire d'un créneau pour l'afficher dans la grille de la semaine. */
export type WeekSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
};

export type WeekDay = {
  /** Date ISO « AAAA-MM-JJ ». */
  date: string;
  /** Créneaux du jour, du plus tôt au plus tard. */
  slots: WeekSlot[];
  counts: { available: number; booked: number; blocked: number };
};

/** Lundi de la semaine (ISO) qui contient la date. Calcul en UTC : indépendant du fuseau du navigateur. */
export function startOfIsoWeek(isoDate: string): string {
  const weekday = new Date(`${isoDate}T12:00:00Z`).getUTCDay(); // 0 = dimanche
  return addDays(isoDate, -(weekday === 0 ? 6 : weekday - 1));
}

/**
 * Répartit les créneaux sur les sept jours de la semaine commençant le `weekStart` (un lundi), avec les
 * effectifs par statut. Un jour sans créneau est présent, avec une liste vide : la grille a toujours 7 colonnes.
 */
export function buildWeek(slots: WeekSlot[], weekStart: string): WeekDay[] {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(weekStart, offset);
    const daySlots = slots
      .filter((slot) => slot.date === date)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    return {
      date,
      slots: daySlots,
      counts: {
        available: daySlots.filter((slot) => slot.status === SlotStatus.AVAILABLE).length,
        booked: daySlots.filter((slot) => slot.status === SlotStatus.BOOKED).length,
        blocked: daySlots.filter((slot) => slot.status === SlotStatus.BLOCKED).length,
      },
    };
  });
}

/** « lun. 20 oct. » : jour et date d'une colonne, dans la langue de l'interface. */
export function formatWeekdayLabel(isoDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T12:00:00Z`),
  );
}
