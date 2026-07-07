// src/application/booking/GetAvailableSlots.ts
import type { Slot } from '@/domain/slot/Slot';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import type { HolidayRepository } from '@/domain/holiday/HolidayRepository';

export type GetAvailableSlotsInput = {
  serviceId: string;
  from: string; // ISO "YYYY-MM-DD"
  to: string;
};

/**
 * Use case : liste les créneaux réservables pour un service sur une période,
 * en excluant les jours fériés/congés.
 *
 * Use case en lecture seule : pas d'audit log (on ne trace que les actions
 * qui modifient un état), pas d'email.
 */
export class GetAvailableSlots {
  constructor(
    private readonly slotRepository: SlotRepository,
    private readonly holidayRepository: HolidayRepository,
  ) {}

  async execute(input: GetAvailableSlotsInput): Promise<Slot[]> {
    const [slots, holidays] = await Promise.all([
      this.slotRepository.findAvailableByService(input.serviceId, input.from, input.to),
      this.holidayRepository.findByDateRange(input.from, input.to),
    ]);

    // Double vérification métier : même si l'admin a normalement bloqué les
    // créneaux d'un jour férié en amont, on filtre ici par sécurité.
    return slots.filter((slot) => !holidays.some((holiday) => holiday.appliesTo(slot.date)));
  }
}
