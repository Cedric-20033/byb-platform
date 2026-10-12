// src/application/admin/slotsBulk.test.ts
// Tests des opérations de masse sur les créneaux : blocage et suppression par période.
import { describe, expect, it } from 'vitest';
import { SlotStatus } from '@/domain/slot/Slot';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { FixedClock } from '@/test/fakes/FixedClock';
import { InMemorySlotRepository } from '@/test/fakes/InMemorySlotRepository';
import { OTHER_SERVICE, SERVICE, slot } from '@/test/fixtures/appointmentWorld';
import { BlockSlotsInRange } from './BlockSlotsInRange';
import { DeleteAvailableSlots } from './DeleteAvailableSlots';

/** 15 octobre 2026 à Bruxelles : « aujourd'hui » vaut 2026-10-15. */
const NOW = '2026-10-15T10:00:00+02:00';
const actor = { actorId: 'admin-1', actorRole: ActorRole.ADMIN };

function setup() {
  const slots = new InMemorySlotRepository([
    slot('past', '2026-10-10', '09:00', '10:00'),
    slot('a-am', '2026-10-20', '09:00', '10:00'),
    slot('a-noon', '2026-10-20', '12:00', '13:00'),
    slot('a-pm', '2026-10-20', '15:00', '16:00'),
    slot('a-booked', '2026-10-20', '10:00', '11:00', SlotStatus.BOOKED),
    slot('a-blocked', '2026-10-20', '11:00', '12:00', SlotStatus.BLOCKED),
    slot('other', '2026-10-20', '09:00', '10:00', SlotStatus.AVAILABLE, OTHER_SERVICE),
    slot('later', '2026-10-25', '09:00', '10:00'),
  ]);
  const auditLogger = new FakeAuditLogger();
  const clock = FixedClock.at(NOW);
  return {
    slots,
    auditLogger,
    block: new BlockSlotsInRange(slots, auditLogger, clock),
    remove: new DeleteAvailableSlots(slots, auditLogger, clock),
  };
}

const statusOf = async (slots: InMemorySlotRepository, id: string) => (await slots.findById(id))?.status;

describe('BlockSlotsInRange', () => {
  it('bloque les créneaux libres de la période, tous services confondus', async () => {
    const { block, slots } = setup();

    const result = await block.execute({ from: '2026-10-20', to: '2026-10-20', ...actor });

    expect(result.blocked).toBe(4); // 3 du service principal + 1 de l'autre service
    for (const id of ['a-am', 'a-noon', 'a-pm', 'other']) expect(await statusOf(slots, id), id).toBe(SlotStatus.BLOCKED);
  });

  it('ne touche jamais un créneau réservé et le compte à part', async () => {
    const { block, slots } = setup();

    const result = await block.execute({ from: '2026-10-20', to: '2026-10-20', ...actor });

    expect(result.skippedBooked).toBe(1);
    expect(await statusOf(slots, 'a-booked')).toBe(SlotStatus.BOOKED);
  });

  it('se limite à un service', async () => {
    const { block, slots } = setup();

    const result = await block.execute({ from: '2026-10-20', to: '2026-10-20', serviceId: SERVICE, ...actor });

    expect(result.blocked).toBe(3);
    expect(await statusOf(slots, 'other')).toBe(SlotStatus.AVAILABLE);
  });

  it('se limite à une plage horaire : seuls les créneaux entièrement contenus sont bloqués', async () => {
    const { block, slots } = setup();

    const result = await block.execute({
      from: '2026-10-20',
      to: '2026-10-20',
      serviceId: SERVICE,
      startTime: '12:00',
      endTime: '16:00',
      ...actor,
    });

    expect(result.blocked).toBe(2);
    expect(await statusOf(slots, 'a-am')).toBe(SlotStatus.AVAILABLE);
    expect(await statusOf(slots, 'a-noon')).toBe(SlotStatus.BLOCKED);
    expect(await statusOf(slots, 'a-pm')).toBe(SlotStatus.BLOCKED);
  });

  it('ignore le passé et ne trace rien quand il n\'y a rien à bloquer', async () => {
    const { block, slots, auditLogger } = setup();

    const result = await block.execute({ from: '2026-10-01', to: '2026-10-12', ...actor });

    expect(result).toEqual({ blocked: 0, skippedBooked: 0 });
    expect(await statusOf(slots, 'past')).toBe(SlotStatus.AVAILABLE);
    expect(auditLogger.entries).toEqual([]);
  });

  it('trace le blocage en lot avec la période et les effectifs', async () => {
    const { block, auditLogger } = setup();

    await block.execute({ from: '2026-10-20', to: '2026-10-25', serviceId: SERVICE, ...actor });

    expect(auditLogger.entries).toEqual([
      {
        ...actor,
        action: AuditAction.SLOTS_BLOCKED_IN_RANGE,
        targetType: 'slot',
        targetId: null,
        metadata: {
          serviceId: SERVICE,
          from: '2026-10-20',
          to: '2026-10-25',
          startTime: null,
          endTime: null,
          count: 4,
          skippedBooked: 1,
        },
      },
    ]);
  });

  it('commence à aujourd\'hui quand la période démarre dans le passé', async () => {
    const { block, auditLogger } = setup();

    await block.execute({ from: '2026-10-01', to: '2026-10-31', serviceId: SERVICE, ...actor });

    expect(auditLogger.entries[0].metadata).toMatchObject({ from: '2026-10-15' });
  });
});

describe('DeleteAvailableSlots', () => {
  it('supprime les créneaux libres et à venir de la période', async () => {
    const { remove, slots } = setup();

    const deleted = await remove.execute({ from: '2026-10-01', to: '2026-10-31', serviceId: SERVICE, ...actor });

    expect(deleted).toBe(4); // a-am, a-noon, a-pm, later
    for (const id of ['a-am', 'a-noon', 'a-pm', 'later']) expect(await slots.findById(id), id).toBeNull();
  });

  it('ne supprime jamais un créneau réservé, bloqué, passé ou d\'un autre service', async () => {
    const { remove, slots } = setup();

    await remove.execute({ from: '2026-10-01', to: '2026-10-31', serviceId: SERVICE, ...actor });

    for (const id of ['past', 'a-booked', 'a-blocked', 'other']) expect(await slots.findById(id), id).not.toBeNull();
  });

  it('trace la suppression avec le nombre de créneaux', async () => {
    const { remove, auditLogger } = setup();

    await remove.execute({ from: '2026-10-20', to: '2026-10-20', serviceId: SERVICE, ...actor });

    expect(auditLogger.entries).toEqual([
      {
        ...actor,
        action: AuditAction.SLOTS_DELETED,
        targetType: 'slot',
        targetId: null,
        metadata: { serviceId: SERVICE, from: '2026-10-20', to: '2026-10-20', count: 3 },
      },
    ]);
  });

  it('ne trace rien quand aucun créneau n\'est supprimé', async () => {
    const { remove, auditLogger } = setup();

    expect(await remove.execute({ from: '2026-12-01', to: '2026-12-31', ...actor })).toBe(0);
    expect(auditLogger.entries).toEqual([]);
  });
});
