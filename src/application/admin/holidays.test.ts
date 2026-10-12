// src/application/admin/holidays.test.ts
// Tests des use cases de congés : conflits, création avec résolution, import des jours fériés belges.
import { describe, expect, it } from 'vitest';
import { CancelAppointment } from '@/application/booking/CancelAppointment';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { Holiday } from '@/domain/holiday/Holiday';
import { SlotStatus } from '@/domain/slot/Slot';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { EmailType } from '@/domain/shared/EmailProvider';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { FakeEmailProvider } from '@/test/fakes/FakeEmailProvider';
import { FixedClock } from '@/test/fakes/FixedClock';
import { InMemoryHolidayRepository } from '@/test/fakes/InMemoryHolidayRepository';
import { buildAppointmentWorld, slot } from '@/test/fixtures/appointmentWorld';
import { BELGIAN_HOLIDAY_KEYS, type BelgianHolidayKey } from '@/domain/holiday/BelgianHolidays';
import { CreateHoliday, type CreateHolidayInput } from './CreateHoliday';
import { FindHolidayConflicts } from './FindHolidayConflicts';
import { ImportBelgianHolidays } from './ImportBelgianHolidays';

/**
 * 15 juillet 2026 à Bruxelles : « aujourd'hui » vaut 2026-07-15. Les rendez-vous d'août 2026 sont donc À VENIR (seuls
 * ceux-là comptent comme conflits) et celui du 1er juillet est PASSÉ.
 */
const NOW = '2026-07-15T10:00:00+02:00';

function setup(
  slots = [
    slot('past', '2026-07-01', '09:00', '10:00', SlotStatus.BOOKED),
    slot('aug-1', '2026-08-04', '09:00', '10:00', SlotStatus.BOOKED),
    slot('aug-2', '2026-08-06', '09:00', '10:00', SlotStatus.BOOKED),
    slot('christmas-26', '2026-12-25', '09:00', '10:00', SlotStatus.BOOKED),
    slot('christmas-27', '2027-12-25', '09:00', '10:00', SlotStatus.BOOKED),
    slot('future', '2026-11-20', '09:00', '10:00', SlotStatus.BOOKED),
  ],
) {
  const world = buildAppointmentWorld(slots);
  const holidays = new InMemoryHolidayRepository();
  const emailProvider = new FakeEmailProvider();
  const auditLogger = new FakeAuditLogger();
  const clock = FixedClock.at(NOW);
  const finder = new FindHolidayConflicts(world.appointmentRepository, clock);
  const cancel = new CancelAppointment(world.appointmentRepository, world.slotRepository, emailProvider, auditLogger);
  const createHoliday = new CreateHoliday(holidays, finder, cancel, auditLogger);
  const create = (input: Partial<CreateHolidayInput> & Pick<CreateHolidayInput, 'date' | 'label'>) =>
    createHoliday.execute({ isRecurring: false, actorId: 'admin-1', actorRole: ActorRole.ADMIN, ...input });

  return { ...world, holidays, emailProvider, auditLogger, finder, createHoliday, create };
}

describe('FindHolidayConflicts', () => {
  it('liste les rendez-vous actifs tombant dans la plage, du plus proche au plus lointain', async () => {
    const { seedAppointment, finder } = setup();
    await seedAppointment('aug-2', { name: 'Après' });
    await seedAppointment('aug-1', { name: 'Avant' });

    const conflicts = await finder.execute({ date: '2026-08-03', endDate: '2026-08-14', isRecurring: false });

    expect(conflicts.map(({ appointment }) => appointment.clientName)).toEqual(['Avant', 'Après']);
  });

  it('ignore les rendez-vous annulés, passés ou hors plage', async () => {
    const { seedAppointment, finder } = setup();
    await seedAppointment('aug-1', { status: AppointmentStatus.CANCELLED });
    await seedAppointment('past');
    await seedAppointment('future');

    // Le rendez-vous annulé du 4 août ne compte pas ; celui du 1er juillet est PASSÉ (aujourd'hui = 15 juillet).
    expect(await finder.execute({ date: '2026-08-03', endDate: '2026-08-14', isRecurring: false })).toEqual([]);
    expect(await finder.execute({ date: '2026-07-01', endDate: '2026-07-14', isRecurring: false })).toEqual([]);
  });

  it('retrouve les rendez-vous d\'une année à venir pour un congé récurrent', async () => {
    const { seedAppointment, finder } = setup();
    await seedAppointment('christmas-26');
    await seedAppointment('christmas-27');

    const conflicts = await finder.execute({ date: '2020-12-25', endDate: '2020-12-25', isRecurring: true });

    expect(conflicts).toHaveLength(2);
  });
});

describe('CreateHoliday', () => {
  it('crée un congé d\'un jour sans conflit, avec une fin égale au début', async () => {
    const { create, holidays } = setup();

    const { holiday } = await create({ date: '2026-12-31', label: 'Réveillon' });

    expect(holiday.endDate).toBe('2026-12-31');
    expect(holidays.all()).toHaveLength(1);
  });

  it('crée une plage de congés', async () => {
    const { create, holidays } = setup([]);

    await create({ date: '2026-08-03', endDate: '2026-08-14', label: 'Congés annuels' });

    expect(holidays.all()[0]).toMatchObject({ date: '2026-08-03', endDate: '2026-08-14' });
  });

  it('REFUSE de créer tant que l\'admin n\'a pas tranché sur les rendez-vous touchés', async () => {
    const { create, seedAppointment, holidays, auditLogger } = setup();
    await seedAppointment('aug-1');

    await expect(create({ date: '2026-08-03', endDate: '2026-08-14', label: 'Congés' })).rejects.toMatchObject({
      code: 'HOLIDAY_CONFLICTS',
    });

    expect(holidays.all()).toEqual([]);
    expect(auditLogger.entries).toEqual([]);
  });

  it('résolution « ignorer » : le congé est créé et les rendez-vous restent intacts', async () => {
    const { create, seedAppointment, appointmentRepository, slotRepository, emailProvider } = setup();
    const appointment = await seedAppointment('aug-1');

    const result = await create({ date: '2026-08-03', endDate: '2026-08-14', label: 'Congés', resolution: { mode: 'ignore' } });

    expect(result).toMatchObject({ ignoredCount: 1, cancelledCount: 0, failedCount: 0 });
    expect((await appointmentRepository.findById(appointment.id))?.status).toBe(AppointmentStatus.CONFIRMED);
    expect((await slotRepository.findById('aug-1'))?.status).toBe(SlotStatus.BOOKED);
    expect(emailProvider.sent).toEqual([]);
  });

  it('résolution « annuler » : annule chaque rendez-vous, libère les créneaux et prévient les clients avec le message', async () => {
    const { create, seedAppointment, appointmentRepository, slotRepository, emailProvider } = setup();
    const first = await seedAppointment('aug-1', { email: 'a@example.com' });
    const second = await seedAppointment('aug-2', { email: 'b@example.com' });

    const result = await create({
      date: '2026-08-03',
      endDate: '2026-08-14',
      label: 'Congés',
      resolution: { mode: 'cancel', reason: 'Nous sommes fermés.' },
    });

    expect(result).toMatchObject({ cancelledCount: 2, failedCount: 0, ignoredCount: 0 });
    expect((await appointmentRepository.findById(first.id))?.status).toBe(AppointmentStatus.CANCELLED);
    expect((await appointmentRepository.findById(second.id))?.status).toBe(AppointmentStatus.CANCELLED);
    expect((await slotRepository.findById('aug-1'))?.status).toBe(SlotStatus.AVAILABLE);
    expect(emailProvider.sent.map((mail) => mail.to).sort()).toEqual(['a@example.com', 'b@example.com']);
    expect(emailProvider.sent[0]).toMatchObject({
      type: EmailType.APPOINTMENT_CANCELLATION,
      data: { reason: 'Nous sommes fermés.' },
    });
  });

  it('poursuit les annulations quand l\'une échoue et le signale', async () => {
    const world = setup();
    await world.seedAppointment('aug-1');
    await world.seedAppointment('aug-2');
    let calls = 0;
    const flakyCanceller = {
      execute: async () => {
        if (++calls === 1) throw new Error('indisponible');
      },
    };
    const createHoliday = new CreateHoliday(world.holidays, world.finder, flakyCanceller, world.auditLogger);

    const result = await createHoliday.execute({
      date: '2026-08-03',
      endDate: '2026-08-14',
      label: 'Congés',
      isRecurring: false,
      resolution: { mode: 'cancel' },
      actorId: 'admin-1',
      actorRole: ActorRole.ADMIN,
    });

    expect(result).toMatchObject({ cancelledCount: 1, failedCount: 1 });
  });

  it('trace la création avec la plage, les conflits et la décision', async () => {
    const { create, seedAppointment, auditLogger } = setup();
    const appointment = await seedAppointment('aug-1');

    const { holiday } = await create({ date: '2026-08-03', endDate: '2026-08-14', label: 'Congés', resolution: { mode: 'cancel' } });

    const creation = auditLogger.entries.find((entry) => entry.action === AuditAction.HOLIDAY_CREATED);
    expect(creation).toMatchObject({
      targetId: holiday.id,
      metadata: { label: 'Congés', endDate: '2026-08-14', conflicts: 1, resolution: 'cancel', cancelled: 1, failed: 0 },
    });
    // L'annulation de chaque rendez-vous est tracée à part, par le use case d'annulation.
    expect(
      auditLogger.entries.some((entry) => entry.action === AuditAction.APPOINTMENT_CANCELLED && entry.targetId === appointment.id),
    ).toBe(true);
  });
});

describe('ImportBelgianHolidays', () => {
  const labels = Object.fromEntries(BELGIAN_HOLIDAY_KEYS.map((key) => [key, `Libellé ${key}`])) as Record<BelgianHolidayKey, string>;
  const run = (world: ReturnType<typeof setup>, year = 2027) =>
    new ImportBelgianHolidays(world.holidays, world.createHoliday).execute({
      year,
      labels,
      actorId: 'admin-1',
      actorRole: ActorRole.ADMIN,
    });

  it('crée les dix jours fériés, les fêtes fixes en récurrent et les fêtes mobiles pour l\'année seulement', async () => {
    const world = setup([]);

    const result = await run(world);

    expect(result).toEqual({ created: 10, skipped: 0, ignoredConflicts: 0 });
    const christmas = world.holidays.all().find((holiday) => holiday.label === 'Libellé christmas');
    const easterMonday = world.holidays.all().find((holiday) => holiday.label === 'Libellé easterMonday');
    expect(christmas).toMatchObject({ isRecurring: true, date: '2027-12-25' });
    expect(easterMonday).toMatchObject({ isRecurring: false, date: '2027-03-29' });
  });

  it('est idempotent : relancer l\'import ne duplique rien', async () => {
    const world = setup([]);
    await run(world);

    expect(await run(world)).toEqual({ created: 0, skipped: 10, ignoredConflicts: 0 });
    expect(world.holidays.all()).toHaveLength(10);
  });

  it('ne réimporte pas les fêtes fixes quand l\'année suivante est importée : elles sont déjà récurrentes', async () => {
    const world = setup([]);
    await run(world, 2027);

    const next = await run(world, 2028);

    // Seules les 3 fêtes mobiles de 2028 sont nouvelles ; les 7 fêtes fixes existent déjà (récurrentes).
    expect(next).toMatchObject({ created: 3, skipped: 7 });
  });

  it('ne recrée pas un jour déjà couvert par un congé existant', async () => {
    const world = setup([]);
    await world.holidays.save(new Holiday('', '2027-12-24', 'Fermeture', false, '2027-12-26'));

    const result = await run(world);

    expect(result).toMatchObject({ created: 9, skipped: 1 });
  });

  it('laisse les rendez-vous existants en place et en donne le nombre', async () => {
    const world = setup([slot('christmas-27', '2027-12-25', '09:00', '10:00', SlotStatus.BOOKED)]);
    const appointment = await world.seedAppointment('christmas-27');

    const result = await run(world);

    expect(result.ignoredConflicts).toBe(1);
    expect((await world.appointmentRepository.findById(appointment.id))?.status).toBe(AppointmentStatus.CONFIRMED);
  });
});
