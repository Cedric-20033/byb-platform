// src/application/admin/DeleteAvailableSlots.ts
import { SlotStatus } from '@/domain/slot/Slot';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import { AuditAction, type ActorRole, type AuditLogger } from '@/domain/shared/AuditLogger';
import { systemClock, type Clock } from '@/domain/shared/Clock';
import { toIsoDate } from '@/domain/shared/IsoDate';

export type DeleteAvailableSlotsInput = {
  from: string;
  to: string;
  /** Absent = tous les services. */
  serviceId?: string | null;
  actorId: string;
  actorRole: ActorRole;
};

/**
 * Use case : un admin supprime les créneaux LIBRES et À VENIR d'une période (erreur de génération, changement
 * d'horaires). Les créneaux réservés portent un rendez-vous et les créneaux bloqués sont un choix de l'admin :
 * ni les uns ni les autres ne sont jamais supprimés ici. Renvoie le nombre de créneaux supprimés.
 */
export class DeleteAvailableSlots {
  constructor(
    private readonly slotRepository: SlotRepository,
    private readonly auditLogger: AuditLogger,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(input: DeleteAvailableSlotsInput): Promise<number> {
    const today = toIsoDate(this.clock.now());
    const from = input.from > today ? input.from : today;
    if (from > input.to) return 0;

    const free = (await this.slotRepository.findInRange({ from, to: input.to, serviceId: input.serviceId })).filter(
      (slot) => slot.isAvailable(),
    );

    // La garde de statut est rejouée côté base : un créneau réservé entre la lecture et la suppression survit.
    const deleted = await this.slotRepository.deleteByIds(
      free.map((slot) => slot.id),
      SlotStatus.AVAILABLE,
    );

    if (deleted > 0) {
      await this.auditLogger.log({
        actorId: input.actorId,
        actorRole: input.actorRole,
        action: AuditAction.SLOTS_DELETED,
        targetType: 'slot',
        targetId: null,
        metadata: { serviceId: input.serviceId ?? null, from, to: input.to, count: deleted },
      });
    }

    return deleted;
  }
}
