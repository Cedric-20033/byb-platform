// src/application/admin/GetCalendarRange.ts
import type { AppointmentRepository } from '@/domain/appointment/AppointmentRepository';
import type { AppointmentWithSlot } from '@/domain/appointment/AppointmentWithSlot';
import type { HolidayRepository } from '@/domain/holiday/HolidayRepository';
import type { Slot } from '@/domain/slot/Slot';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import { eachDate } from '@/domain/shared/IsoDate';

/** Couches facultatives : l'appelant n'active que celles que l'admin a le droit de voir. */
export type CalendarLayers = { blockedSlots: boolean; holidays: boolean };

export type CalendarHoliday = { date: string; label: string };

export type CalendarRange = {
  appointments: AppointmentWithSlot[];
  blockedSlots: Slot[];
  holidays: CalendarHoliday[];
};

/**
 * Use case (lecture seule) : tout ce qu'affiche le calendrier sur une période.
 *
 * Les rendez-vous annulés n'occupent plus de temps : ils n'apparaissent pas. Les jours fériés
 * récurrents sont développés jour par jour, pour que l'interface n'ait aucune règle de récurrence à connaître.
 */
export class GetCalendarRange {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly slotRepository: SlotRepository,
    private readonly holidayRepository: HolidayRepository,
  ) {}

  async execute(input: { from: string; to: string; layers: CalendarLayers }): Promise<CalendarRange> {
    const { from, to, layers } = input;

    const [scheduled, blockedSlots, holidayDefinitions] = await Promise.all([
      this.appointmentRepository.searchWithSlot({ dateFrom: from, dateTo: to }),
      layers.blockedSlots ? this.slotRepository.findBlockedBetween(from, to) : Promise.resolve([]),
      layers.holidays ? this.holidayRepository.findByDateRange(from, to) : Promise.resolve([]),
    ]);

    const appointments = scheduled
      .filter(({ appointment }) => appointment.isActive())
      .sort((a, b) => `${a.slotDate} ${a.slotStartTime}`.localeCompare(`${b.slotDate} ${b.slotStartTime}`));

    const holidays = eachDate(from, to).flatMap((date) =>
      holidayDefinitions.filter((holiday) => holiday.appliesTo(date)).map((holiday) => ({ date, label: holiday.label })),
    );

    return { appointments, blockedSlots, holidays };
  }
}
