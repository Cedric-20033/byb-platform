// src/application/admin/GenerateAvailableSlots.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { GenerateAvailableSlots } from './GenerateAvailableSlots';
import { Holiday } from '@/domain/holiday/Holiday';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { InMemorySlotRepository } from '@/test/fakes/InMemorySlotRepository';
import { InMemoryHolidayRepository } from '@/test/fakes/InMemoryHolidayRepository';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';

const BASE_INPUT = {
  serviceId: 'service-1',
  dailyStartTime: '09:00',
  dailyEndTime: '12:00',
  slotDurationMinutes: 60,
  actorId: null,
  actorRole: ActorRole.SYSTEM,
};

describe('GenerateAvailableSlots', () => {
  let slots: InMemorySlotRepository;
  let holidays: InMemoryHolidayRepository;
  let audit: FakeAuditLogger;
  let useCase: GenerateAvailableSlots;

  beforeEach(() => {
    slots = new InMemorySlotRepository();
    holidays = new InMemoryHolidayRepository();
    audit = new FakeAuditLogger();
    useCase = new GenerateAvailableSlots(slots, holidays, audit);
  });

  it('génère les créneaux aux dates exactes demandées, sans décalage de jour (régression fuseau)', async () => {
    // Du lundi 5 au mercredi 7 octobre 2026 : 3 jours × 3 créneaux.
    const created = await useCase.execute({ ...BASE_INPUT, from: '2026-10-05', to: '2026-10-07' });

    expect(created).toBe(9);
    const dates = [...new Set(slots.all().map((s) => s.date))].sort();
    expect(dates).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']);
  });

  it('ignore les week-ends par défaut', async () => {
    // Vendredi 2 → lundi 5 octobre 2026.
    await useCase.execute({ ...BASE_INPUT, from: '2026-10-02', to: '2026-10-05' });

    const dates = [...new Set(slots.all().map((s) => s.date))].sort();
    expect(dates).toEqual(['2026-10-02', '2026-10-05']);
  });

  it('respecte les jours travaillés fournis', async () => {
    await useCase.execute({ ...BASE_INPUT, from: '2026-10-02', to: '2026-10-05', workingDays: [6] }); // samedi

    expect([...new Set(slots.all().map((s) => s.date))]).toEqual(['2026-10-03']);
  });

  it('saute les jours fériés, y compris récurrents', async () => {
    await holidays.save(new Holiday('', '2026-10-06', 'Congé', false));
    await holidays.save(new Holiday('', '2020-10-07', 'Férié annuel', true));

    await useCase.execute({ ...BASE_INPUT, from: '2026-10-05', to: '2026-10-07' });

    expect([...new Set(slots.all().map((s) => s.date))]).toEqual(['2026-10-05']);
  });

  it('découpe la journée en créneaux contigus de la durée demandée', async () => {
    await useCase.execute({ ...BASE_INPUT, from: '2026-10-05', to: '2026-10-05' });

    const ranges = slots.all().map((s) => `${s.range.startTime}-${s.range.endTime}`);
    expect(ranges).toEqual(['09:00-10:00', '10:00-11:00', '11:00-12:00']);
  });

  it('est idempotent : relancer ne duplique aucun créneau', async () => {
    const input = { ...BASE_INPUT, from: '2026-10-05', to: '2026-10-06' };

    expect(await useCase.execute(input)).toBe(6);
    expect(await useCase.execute(input)).toBe(0);
    expect(slots.all()).toHaveLength(6);
  });

  it('traverse le changement d\'heure sans perdre ni dupliquer de jour', async () => {
    // Fin octobre 2026 : retour à l'heure d'hiver le dimanche 25 (week-end ignoré).
    await useCase.execute({ ...BASE_INPUT, from: '2026-10-23', to: '2026-10-27' });

    expect([...new Set(slots.all().map((s) => s.date))].sort()).toEqual([
      '2026-10-23',
      '2026-10-26',
      '2026-10-27',
    ]);
  });

  it('journalise la création uniquement si des créneaux ont été créés', async () => {
    await useCase.execute({ ...BASE_INPUT, from: '2026-10-05', to: '2026-10-05' });
    await useCase.execute({ ...BASE_INPUT, from: '2026-10-05', to: '2026-10-05' });

    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      action: AuditAction.SLOT_CREATED,
      metadata: { count: 3 },
    });
  });
});
