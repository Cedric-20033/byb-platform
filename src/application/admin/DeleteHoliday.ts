// src/application/admin/DeleteHoliday.ts
import type { HolidayRepository } from '@/domain/holiday/HolidayRepository';
import type { AuditLogger } from '@/domain/shared/AuditLogger';
import { AuditAction } from '@/domain/shared/AuditLogger';
import type { ActorRole } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';

export type DeleteHolidayInput = {
  holidayId: string;
  actorId: string;
  actorRole: ActorRole;
};

/**
 * Use case : suppression d'un jour férié / congé (ex: erreur de saisie admin).
 */
export class DeleteHoliday {
  constructor(
    private readonly holidayRepository: HolidayRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(input: DeleteHolidayInput): Promise<void> {
    const holiday = await this.holidayRepository.findById(input.holidayId);
    if (!holiday) {
      throw new DomainError('Jour férié introuvable.', 'HOLIDAY_NOT_FOUND');
    }

    await this.holidayRepository.delete(input.holidayId);

    await this.auditLogger.log({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: AuditAction.HOLIDAY_DELETED,
      targetType: 'holiday',
      targetId: holiday.id,
    });
  }
}
