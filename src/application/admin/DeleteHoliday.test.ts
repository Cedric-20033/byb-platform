// src/application/admin/DeleteHoliday.test.ts
import { describe, expect, it } from 'vitest';
import { Holiday } from '@/domain/holiday/Holiday';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { InMemoryHolidayRepository } from '@/test/fakes/InMemoryHolidayRepository';
import { DeleteHoliday } from './DeleteHoliday';

const actor = { actorId: 'admin-1', actorRole: ActorRole.ADMIN };

async function setup() {
  const holidays = new InMemoryHolidayRepository();
  const christmas = await holidays.save(new Holiday('', '2026-12-25', 'Noël', true));
  const summer = await holidays.save(new Holiday('', '2026-08-03', 'Congés annuels', false, '2026-08-14'));
  const auditLogger = new FakeAuditLogger();
  return { holidays, christmas, summer, auditLogger, remove: new DeleteHoliday(holidays, auditLogger) };
}

describe('DeleteHoliday', () => {
  it('supprime le jour férié demandé et laisse les autres', async () => {
    const { remove, holidays, christmas, summer } = await setup();

    await remove.execute({ holidayId: christmas.id, ...actor });

    expect(holidays.all().map((holiday) => holiday.id)).toEqual([summer.id]);
  });

  it('trace la suppression avec la cible', async () => {
    const { remove, christmas, auditLogger } = await setup();

    await remove.execute({ holidayId: christmas.id, ...actor });

    expect(auditLogger.entries).toEqual([
      { ...actor, action: AuditAction.HOLIDAY_DELETED, targetType: 'holiday', targetId: christmas.id },
    ]);
  });

  it('refuse un jour férié introuvable, sans rien supprimer ni tracer', async () => {
    const { remove, holidays, auditLogger } = await setup();

    await expect(remove.execute({ holidayId: 'missing', ...actor })).rejects.toMatchObject({
      code: 'HOLIDAY_NOT_FOUND',
    });

    expect(holidays.all()).toHaveLength(2);
    expect(auditLogger.entries).toEqual([]);
  });
});
