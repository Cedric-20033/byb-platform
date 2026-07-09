// src/application/admin/BlockSlot.ts
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import type { AuditLogger } from '@/domain/shared/AuditLogger';
import { AuditAction } from '@/domain/shared/AuditLogger';
import type { ActorRole } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import type { SlotStatus } from '@/domain/slot/Slot';

export type BlockSlotInput = {
  slotId: string;
  actorId: string;
  actorRole: ActorRole;
};

/**
 * Use case : un admin bloque manuellement un créneau (indisponibilité imprévue,
 * congé personnel de l'artisan, etc.) sans qu'il y ait de rendez-vous dessus.
 */
export class BlockSlot {
  constructor(
    private readonly slotRepository: SlotRepository,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(input: BlockSlotInput): Promise<void> {
    const slot = await this.slotRepository.findById(input.slotId);
    if (!slot) {
      throw new DomainError('Créneau introuvable.', 'SLOT_NOT_FOUND');
    }
    if (!slot.canBeBlocked()) {
      throw new DomainError('Ce créneau est déjà réservé ou bloqué.', 'SLOT_ALREADY_BLOCKED');
    }

    await this.slotRepository.updateStatus(slot.id, 'blocked' as SlotStatus);

    await this.auditLogger.log({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: AuditAction.SLOT_BLOCKED,
      targetType: 'slot',
      targetId: slot.id,
    });
  }
}
