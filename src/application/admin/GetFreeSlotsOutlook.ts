// src/application/admin/GetFreeSlotsOutlook.ts
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import { systemClock, type Clock } from '@/domain/shared/Clock';
import { addDays, toIsoDate, wallClockToInstant } from '@/domain/shared/IsoDate';

export const FREE_SLOTS_OUTLOOK_DAYS = 7;

export type FreeSlotsDay = { date: string; count: number };

export type FreeSlotsOutlook = {
  /** Un élément par jour, aujourd'hui compris, y compris les jours sans créneau libre. */
  days: FreeSlotsDay[];
  total: number;
};

/**
 * Use case : nombre de créneaux encore réservables sur les 7 prochains jours, jour par jour.
 *
 * Un créneau d'aujourd'hui dont l'heure de début est passée n'est plus réservable : il n'est pas compté,
 * sans quoi le dashboard annoncerait des disponibilités que les visiteurs ne peuvent plus prendre.
 */
export class GetFreeSlotsOutlook {
  constructor(
    private readonly slotRepository: SlotRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(): Promise<FreeSlotsOutlook> {
    const now = this.clock.now();
    const today = toIsoDate(now);

    const slots = await this.slotRepository.findInRange({
      from: today,
      to: addDays(today, FREE_SLOTS_OUTLOOK_DAYS - 1),
    });

    const countByDate = new Map<string, number>();
    for (const slot of slots) {
      if (!slot.isAvailable()) continue;
      if (wallClockToInstant(slot.date, slot.range.startTime).getTime() <= now.getTime()) continue;
      countByDate.set(slot.date, (countByDate.get(slot.date) ?? 0) + 1);
    }

    const days = Array.from({ length: FREE_SLOTS_OUTLOOK_DAYS }, (_, index) => {
      const date = addDays(today, index);
      return { date, count: countByDate.get(date) ?? 0 };
    });

    return { days, total: days.reduce((sum, day) => sum + day.count, 0) };
  }
}
