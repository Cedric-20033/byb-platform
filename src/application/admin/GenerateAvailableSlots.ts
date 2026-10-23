// src/application/admin/GenerateAvailableSlots.ts
import { Slot, SlotStatus } from '@/domain/slot/Slot';
import { TimeRange } from '@/domain/shared/TimeRange';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import type { HolidayRepository } from '@/domain/holiday/HolidayRepository';
import type { AuditLogger } from '@/domain/shared/AuditLogger';
import { AuditAction, type ActorRole } from '@/domain/shared/AuditLogger';
import { dayOfWeek, eachDate } from '@/domain/shared/IsoDate';

export type GenerateAvailableSlotsInput = {
  serviceId: string;
  from: string; // ISO "YYYY-MM-DD"
  to: string;
  dailyStartTime: string; // "HH:mm"
  dailyEndTime: string;
  slotDurationMinutes: number;
  /** Jours travaillés, 0 = dimanche … 6 = samedi. Par défaut lundi-vendredi. */
  workingDays?: number[];
  /** `null` pour une génération automatisée (script, tâche planifiée) sans admin identifié. */
  actorId: string | null;
  actorRole: ActorRole;
};

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

/**
 * Use case : remplit le calendrier d'un service avec des créneaux réservables
 * sur une période donnée, découpés selon les horaires d'ouverture fournis.
 *
 * Sans cet use case, la table `slots` reste vide et le wizard de réservation
 * affiche "aucun créneau disponible" quelle que soit la date choisie — il n'y
 * a tout simplement rien à proposer tant qu'un admin (ou le script de seed)
 * n'a pas généré les créneaux.
 *
 * Idempotent : un créneau déjà existant à une date/heure donnée n'est jamais
 * dupliqué, ce qui permet de relancer l'opération sans risque (ex: étendre
 * l'horizon de réservation chaque semaine via une tâche planifiée).
 */
export class GenerateAvailableSlots {
  constructor(
    private readonly slotRepository: SlotRepository,
    private readonly holidayRepository: HolidayRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(input: GenerateAvailableSlotsInput): Promise<number> {
    const workingDays = input.workingDays ?? DEFAULT_WORKING_DAYS;
    const holidays = await this.holidayRepository.findByDateRange(input.from, input.to);

    let createdCount = 0;

    for (const date of eachDate(input.from, input.to)) {
      if (!workingDays.includes(dayOfWeek(date))) continue;
      if (holidays.some((holiday) => holiday.appliesTo(date))) continue;

      const existingSlots = await this.slotRepository.findByDate(date);
      const alreadyPresent = new Set(
        existingSlots.filter((s) => s.serviceId === input.serviceId).map((s) => s.range.startTime),
      );

      for (const range of this.sliceDay(input.dailyStartTime, input.dailyEndTime, input.slotDurationMinutes)) {
        if (alreadyPresent.has(range.startTime)) continue;

        await this.slotRepository.save(new Slot('', date, range, SlotStatus.AVAILABLE, input.serviceId));
        createdCount++;
      }
    }

    if (createdCount > 0) {
      await this.auditLogger.log({
        actorId: input.actorId,
        actorRole: input.actorRole,
        action: AuditAction.SLOT_CREATED,
        targetType: 'slot',
        targetId: null,
        metadata: { serviceId: input.serviceId, from: input.from, to: input.to, count: createdCount },
      });
    }

    return createdCount;
  }

  /** Découpe une plage horaire quotidienne en créneaux de durée fixe. */
  private sliceDay(dailyStart: string, dailyEnd: string, durationMinutes: number): TimeRange[] {
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const toTimeString = (totalMinutes: number) => {
      const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
      const m = (totalMinutes % 60).toString().padStart(2, '0');
      return `${h}:${m}`;
    };

    const ranges: TimeRange[] = [];
    const endMinutes = toMinutes(dailyEnd);

    for (let start = toMinutes(dailyStart); start + durationMinutes <= endMinutes; start += durationMinutes) {
      ranges.push(new TimeRange(toTimeString(start), toTimeString(start + durationMinutes)));
    }

    return ranges;
  }
}
