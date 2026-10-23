// src/application/admin/UnblockSlot.ts
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import type { AuditLogger } from '@/domain/shared/AuditLogger';
import { AuditAction } from '@/domain/shared/AuditLogger';
import type { ActorRole } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import type { SlotStatus } from '@/domain/slot/Slot';

export type UnblockSlotInput = {
  slotId: string;
  actorId: string;
  actorRole: ActorRole;
};

/**
 * Use case symétrique de BlockSlot : remet un créneau bloqué à disposition.
 */
export class UnblockSlot {
  constructor(
    private readonly slotRepository: SlotRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(input: UnblockSlotInput): Promise<void> {
    const slot = await this.slotRepository.findById(input.slotId);
    if (!slot) {
      throw new DomainError('Créneau introuvable.', 'SLOT_NOT_FOUND');
    }
    if (!slot.canBeUnblocked()) {
      throw new DomainError("Ce créneau n'est pas bloqué.", 'SLOT_NOT_BLOCKED');
    }

    await this.slotRepository.updateStatus(slot.id, 'available' as SlotStatus);

    await this.auditLogger.log({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: AuditAction.SLOT_UNBLOCKED,
      targetType: 'slot',
      targetId: slot.id,
    });
  }
}
