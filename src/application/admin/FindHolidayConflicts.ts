// src/application/admin/FindHolidayConflicts.ts
import type { AppointmentRepository } from '@/domain/appointment/AppointmentRepository';
import type { AppointmentWithSlot } from '@/domain/appointment/AppointmentWithSlot';
import { Holiday } from '@/domain/holiday/Holiday';
import { systemClock, type Clock } from '@/domain/shared/Clock';
import { toIsoDate } from '@/domain/shared/IsoDate';

export type HolidayCandidate = {
  date: string;
  /** Dernier jour inclus ; égal à `date` pour un jour unique. */
  endDate: string;
  isRecurring: boolean;
};

/**
 * Use case (lecture seule) : les rendez-vous actifs qu'un congé, avant d'être créé, ferait tomber un
 * jour de fermeture. Seuls les rendez-vous À VENIR comptent : un rendez-vous passé n'est plus affecté.
 */
export class FindHolidayConflicts {
  constructor(
    private readonly appointmentRepository: AppointmentRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(candidate: HolidayCandidate): Promise<AppointmentWithSlot[]> {
    const today = toIsoDate(this.clock.now());
    const holiday = new Holiday('', candidate.date, '', candidate.isRecurring, candidate.endDate);

    // Un congé récurrent revient chaque année : sa date de saisie ne borne pas la recherche, et la règle de
    // `appliesTo` tranche. Un congé ponctuel se limite à sa plage, jamais avant aujourd'hui.
    const scheduled = await this.appointmentRepository.searchWithSlot(
      holiday.isRecurring
        ? { dateFrom: today }
        : { dateFrom: holiday.date > today ? holiday.date : today, dateTo: holiday.endDate },
    );

    return scheduled
      .filter(({ appointment, slotDate }) => appointment.isActive() && holiday.appliesTo(slotDate))
      .sort((a, b) => `${a.slotDate} ${a.slotStartTime}`.localeCompare(`${b.slotDate} ${b.slotStartTime}`));
  }
}
