// src/application/admin/slotBlocking.test.ts
// Tests du blocage et du déblocage manuels d'un créneau unique (le lot est couvert par slotsBulk.test.ts).
import { describe, expect, it } from 'vitest';
import { SlotStatus } from '@/domain/slot/Slot';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { InMemorySlotRepository } from '@/test/fakes/InMemorySlotRepository';
import { slot } from '@/test/fixtures/appointmentWorld';
import { BlockSlot } from './BlockSlot';
import { UnblockSlot } from './UnblockSlot';

const actor = { actorId: 'admin-1', actorRole: ActorRole.ADMIN };

function setup() {
  const slots = new InMemorySlotRepository([
    slot('free', '2026-10-20', '09:00', '10:00'),
    slot('booked', '2026-10-20', '10:00', '11:00', SlotStatus.BOOKED),
    slot('blocked', '2026-10-20', '11:00', '12:00', SlotStatus.BLOCKED),
  ]);
  const auditLogger = new FakeAuditLogger();
  return {
    slots,
    auditLogger,
    block: new BlockSlot(slots, auditLogger),
    unblock: new UnblockSlot(slots, auditLogger),
  };
}

const statusOf = async (slots: InMemorySlotRepository, id: string) => (await slots.findById(id))?.status;

describe('BlockSlot', () => {
  it('bloque un créneau libre et trace l\'action', async () => {
    const { block, slots, auditLogger } = setup();

    await block.execute({ slotId: 'free', ...actor });

    expect(await statusOf(slots, 'free')).toBe(SlotStatus.BLOCKED);
    expect(auditLogger.entries).toEqual([
      { ...actor, action: AuditAction.SLOT_BLOCKED, targetType: 'slot', targetId: 'free' },
    ]);
  });

  it('refuse un créneau introuvable', async () => {
    const { block, auditLogger } = setup();

    await expect(block.execute({ slotId: 'missing', ...actor })).rejects.toMatchObject({ code: 'SLOT_NOT_FOUND' });
    expect(auditLogger.entries).toEqual([]);
  });

  it.each(['booked', 'blocked'])('refuse un créneau « %s » sans rien modifier ni tracer', async (id) => {
    const { block, slots, auditLogger } = setup();
    const before = await statusOf(slots, id);

    await expect(block.execute({ slotId: id, ...actor })).rejects.toMatchObject({ code: 'SLOT_ALREADY_BLOCKED' });

    expect(await statusOf(slots, id)).toBe(before);
    expect(auditLogger.entries).toEqual([]);
  });
});

describe('UnblockSlot', () => {
  it('remet un créneau bloqué à disposition et trace l\'action', async () => {
    const { unblock, slots, auditLogger } = setup();

    await unblock.execute({ slotId: 'blocked', ...actor });

    expect(await statusOf(slots, 'blocked')).toBe(SlotStatus.AVAILABLE);
    expect(auditLogger.entries).toEqual([
      { ...actor, action: AuditAction.SLOT_UNBLOCKED, targetType: 'slot', targetId: 'blocked' },
    ]);
  });

  it('refuse un créneau introuvable', async () => {
    const { unblock, auditLogger } = setup();

    await expect(unblock.execute({ slotId: 'missing', ...actor })).rejects.toMatchObject({ code: 'SLOT_NOT_FOUND' });
    expect(auditLogger.entries).toEqual([]);
  });

  it.each(['free', 'booked'])('refuse un créneau « %s » qui n\'est pas bloqué', async (id) => {
    const { unblock, slots, auditLogger } = setup();
    const before = await statusOf(slots, id);

    await expect(unblock.execute({ slotId: id, ...actor })).rejects.toMatchObject({ code: 'SLOT_NOT_BLOCKED' });

    // Un créneau réservé ne doit jamais redevenir libre par ce chemin : le rendez-vous serait écrasé.
    expect(await statusOf(slots, id)).toBe(before);
    expect(auditLogger.entries).toEqual([]);
  });
});
