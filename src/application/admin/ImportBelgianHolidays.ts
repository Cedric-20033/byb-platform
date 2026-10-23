// src/application/admin/ImportBelgianHolidays.ts
import { getBelgianHolidays, type BelgianHolidayKey } from '@/domain/holiday/BelgianHolidays';
import type { HolidayRepository } from '@/domain/holiday/HolidayRepository';
import type { ActorRole } from '@/domain/shared/AuditLogger';
import type { CreateHoliday } from './CreateHoliday';

export type ImportBelgianHolidaysInput = {
  year: number;
  /** Libellés traduits de chaque jour férié, fournis par l'appelant (les noms vivent dans les messages i18n). */
  labels: Record<BelgianHolidayKey, string>;
  actorId: string;
  actorRole: ActorRole;
};

export type ImportBelgianHolidaysResult = {
  created: number;
  /** Jours déjà couverts par un congé existant : jamais dupliqués, l'import peut être relancé. */
  skipped: number;
  /** Rendez-vous déjà pris sur les jours importés : laissés en place, à signaler à l'admin. */
  ignoredConflicts: number;
};

/**
 * Use case : pré-remplit les jours fériés légaux belges d'une année (fêtes fixes en récurrent, fêtes mobiles
 * calculées depuis Pâques). Chaque jour est créé par `CreateHoliday` : même audit, même règles.
 *
 * Les rendez-vous déjà pris sur ces jours sont LAISSÉS en place (résolution « ignorer ») : un import en lot ne
 * doit pas annuler des rendez-vous sans que l'admin l'ait décidé. Il en reçoit le nombre pour les replanifier.
 */
export class ImportBelgianHolidays {
  constructor(
    private readonly holidayRepository: HolidayRepository,
    private readonly createHoliday: Pick<CreateHoliday, 'execute'>,
  ) {}

  async execute(input: ImportBelgianHolidaysInput): Promise<ImportBelgianHolidaysResult> {
    const existing = await this.holidayRepository.findAll();
    const result: ImportBelgianHolidaysResult = { created: 0, skipped: 0, ignoredConflicts: 0 };

    for (const rule of getBelgianHolidays(input.year)) {
      if (existing.some((holiday) => holiday.appliesTo(rule.date))) {
        result.skipped++;
        continue;
      }

      const created = await this.createHoliday.execute({
        date: rule.date,
        label: input.labels[rule.key],
        isRecurring: rule.recurring,
        resolution: { mode: 'ignore' },
        actorId: input.actorId,
        actorRole: input.actorRole,
      });

      existing.push(created.holiday);
      result.created++;
      result.ignoredConflicts += created.ignoredCount;
    }

    return result;
  }
}
