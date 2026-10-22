// src/application/booking/GetAvailableSlots.test.ts
import { describe, expect, it } from 'vitest';
import { Holiday } from '@/domain/holiday/Holiday';
import { SlotStatus } from '@/domain/slot/Slot';
import { InMemoryHolidayRepository } from '@/test/fakes/InMemoryHolidayRepository';
import { InMemorySlotRepository } from '@/test/fakes/InMemorySlotRepository';
import { OTHER_SERVICE, SERVICE, slot } from '@/test/fixtures/appointmentWorld';
import { GetAvailableSlots } from './GetAvailableSlots';

function setup(holidays: Holiday[] = []) {
  const slots = new InMemorySlotRepository([
    slot('late', '2026-10-22', '09:00', '10:00'),
    slot('early-pm', '2026-10-20', '14:00', '15:00'),
    slot('early-am', '2026-10-20', '09:00', '10:00'),
    slot('booked', '2026-10-21', '09:00', '10:00', SlotStatus.BOOKED),
    slot('blocked', '2026-10-21', '10:00', '11:00', SlotStatus.BLOCKED),
    slot('other-service', '2026-10-20', '11:00', '12:00', SlotStatus.AVAILABLE, OTHER_SERVICE),
    slot('out-of-range', '2026-11-30', '09:00', '10:00'),
  ]);
  return new GetAvailableSlots(slots, new InMemoryHolidayRepository(holidays));
}

const idsOf = async (useCase: GetAvailableSlots, from = '2026-10-20', to = '2026-10-31') =>
  (await useCase.execute({ serviceId: SERVICE, from, to })).map((found) => found.id);

describe('GetAvailableSlots', () => {
  it('ne renvoie que les créneaux libres du service dans la période, triés par date puis heure', async () => {
    expect(await idsOf(setup())).toEqual(['early-am', 'early-pm', 'late']);
  });

  it('renvoie une liste vide quand rien n\'est disponible', async () => {
    expect(await idsOf(setup(), '2026-12-01', '2026-12-31')).toEqual([]);
  });

  it('exclut les créneaux tombant un jour férié, même s\'ils sont encore marqués libres', async () => {
    const useCase = setup([new Holiday('h1', '2026-10-22', 'Congé exceptionnel', false)]);

    expect(await idsOf(useCase)).toEqual(['early-am', 'early-pm']);
  });

  it('exclut chaque jour d\'une plage de congés, bornes comprises', async () => {
    const useCase = setup([new Holiday('h1', '2026-10-20', 'Fermeture', false, '2026-10-22')]);

    expect(await idsOf(useCase)).toEqual([]);
  });

  it('applique un jour férié récurrent quelle que soit l\'année de sa création', async () => {
    const slots = new InMemorySlotRepository([slot('noel', '2026-12-25', '09:00', '10:00'), slot('veille', '2026-12-24', '09:00', '10:00')]);
    const holidays = new InMemoryHolidayRepository([new Holiday('h1', '2020-12-25', 'Noël', true)]);

    const found = await new GetAvailableSlots(slots, holidays).execute({ serviceId: SERVICE, from: '2026-12-01', to: '2026-12-31' });

    expect(found.map((item) => item.id)).toEqual(['veille']);
  });

  it('ne tient pas compte d\'un congé non récurrent d\'une autre année', async () => {
    const useCase = setup([new Holiday('h1', '2025-10-22', 'Congé de l\'an dernier', false)]);

    expect(await idsOf(useCase)).toEqual(['early-am', 'early-pm', 'late']);
  });
});
