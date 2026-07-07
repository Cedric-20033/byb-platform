// src/application/admin/CreateHoliday.ts
import { Holiday } from '@/domain/holiday/Holiday';
import type { HolidayRepository } from '@/domain/holiday/HolidayRepository';
import type { AuditLogger } from '@/domain/shared/AuditLogger';
import { AuditAction } from '@/domain/shared/AuditLogger';
import type { ActorRole } from '@/domain/shared/AuditLogger';

export type CreateHolidayInput = {
  date: string;
  label: string;
  isRecurring: boolean;
  actorId: string;
  actorRole: ActorRole;
};

/**
 * Use case : un admin déclare un jour férié ou un congé.
 * Bloque automatiquement la prise de RDV sur cette date (voir GetAvailableSlots).
 */
export class CreateHoliday {
  constructor(
    private readonly holidayRepository: HolidayRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(input: CreateHolidayInput): Promise<Holiday> {
    const draft = new Holiday('', input.date, input.label, input.isRecurring);
    const holiday = await this.holidayRepository.save(draft);

    await this.auditLogger.log({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: AuditAction.HOLIDAY_CREATED,
      targetType: 'holiday',
      targetId: holiday.id,
      metadata: { label: holiday.label, isRecurring: holiday.isRecurring },
    });

    return holiday;
  }
}
