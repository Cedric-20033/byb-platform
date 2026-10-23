// src/application/admin/BlockSlotsInRange.ts
import { SlotStatus } from '@/domain/slot/Slot';
import type { SlotRepository } from '@/domain/slot/SlotRepository';
import { AuditAction, type ActorRole, type AuditLogger } from '@/domain/shared/AuditLogger';
import { systemClock, type Clock } from '@/domain/shared/Clock';
import { toIsoDate } from '@/domain/shared/IsoDate';

export type BlockSlotsInRangeInput = {
  from: string;
  to: string;
  /** Absent = tous les services. */
  serviceId?: string | null;
  /** Fenêtre horaire « HH:mm » facultative : seuls les créneaux entièrement contenus dedans sont bloqués. */
  startTime?: string | null;
  endTime?: string | null;
  actorId: string;
  actorRole: ActorRole;
};

export type BlockSlotsInRangeResult = {
  blocked: number;
  /** Créneaux déjà réservés dans le périmètre : jamais modifiés, signalés pour que l'admin les traite à la main. */
  skippedBooked: number;
};

/**
 * Use case : un admin bloque d'un coup les créneaux libres d'une période (journée, semaine de congé personnel…),
 * pour un service ou pour tous, éventuellement sur une plage horaire.
 *
 * Bloquer ne touche que les créneaux LIBRES : un créneau réservé porte un rendez-vous, qu'on ne fait pas
 * disparaître sans l'avoir décidé (on les compte à part). Le passé est ignoré : bloquer hier n'a aucun sens.
 */
export class BlockSlotsInRange {
  constructor(
    private readonly slotRepository: SlotRepository,
    private readonly auditLogger: AuditLogger,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(input: BlockSlotsInRangeInput): Promise<BlockSlotsInRangeResult> {
    const today = toIsoDate(this.clock.now());
    const from = input.from > today ? input.from : today;
    if (from > input.to) return { blocked: 0, skippedBooked: 0 };

    const inScope = (await this.slotRepository.findInRange({ from, to: input.to, serviceId: input.serviceId })).filter(
      (slot) => this.isInsideWindow(slot.range.startTime, slot.range.endTime, input),
    );

    const freeIds = inScope.filter((slot) => slot.canBeBlocked()).map((slot) => slot.id);
    const skippedBooked = inScope.filter((slot) => slot.status === SlotStatus.BOOKED).length;

    const blocked = await this.slotRepository.updateStatusByIds(freeIds, SlotStatus.AVAILABLE, SlotStatus.BLOCKED);

    if (blocked > 0) {
      await this.auditLogger.log({
        actorId: input.actorId,
        actorRole: input.actorRole,
        action: AuditAction.SLOTS_BLOCKED_IN_RANGE,
        targetType: 'slot',
        targetId: null,
        metadata: {
          serviceId: input.serviceId ?? null,
          from,
          to: input.to,
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          count: blocked,
          skippedBooked,
        },
      });
    }

    return { blocked, skippedBooked };
  }

  /** La base renvoie « HH:mm:ss », la saisie « HH:mm » : on compare à la minute. */
  private isInsideWindow(slotStart: string, slotEnd: string, window: Pick<BlockSlotsInRangeInput, 'startTime' | 'endTime'>): boolean {
    if (!window.startTime || !window.endTime) return true;
    return slotStart.slice(0, 5) >= window.startTime && slotEnd.slice(0, 5) <= window.endTime;
  }
}
