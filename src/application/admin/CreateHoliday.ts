// src/application/admin/CreateHoliday.ts
import { Holiday } from '@/domain/holiday/Holiday';
import type { HolidayRepository } from '@/domain/holiday/HolidayRepository';
import { AuditAction, type ActorRole, type AuditLogger } from '@/domain/shared/AuditLogger';
import { DomainError } from '@/domain/shared/DomainError';
import type { CancelAppointmentInput } from '@/application/booking/CancelAppointment';
import type { FindHolidayConflicts } from './FindHolidayConflicts';

/** Ce que l'admin décide pour les rendez-vous déjà pris sur la période du congé. */
export type HolidayConflictResolution =
  | { mode: 'ignore' }
  /** Annule chaque rendez-vous touché ; `reason` est joint à l'email d'annulation du client. */
  | { mode: 'cancel'; reason?: string | null };

export type CreateHolidayInput = {
  date: string;
  /** Dernier jour inclus ; par défaut `date` (congé d'un seul jour). */
  endDate?: string | null;
  label: string;
  isRecurring: boolean;
  /** Obligatoire dès qu'au moins un rendez-vous est touché : sans décision explicite, rien n'est créé. */
  resolution?: HolidayConflictResolution;
  actorId: string;
  actorRole: ActorRole;
};

export type CreateHolidayResult = {
  holiday: Holiday;
  /** Rendez-vous touchés, laissés tels quels (résolution « ignorer »). */
  ignoredCount: number;
  cancelledCount: number;
  /** Rendez-vous que l'annulation n'a pas pu traiter (déjà annulés entre-temps, erreur technique…). */
  failedCount: number;
};

/** Le use case d'annulation existant, réutilisé tel quel : même email, même libération de créneau, même audit. */
type AppointmentCanceller = { execute(input: CancelAppointmentInput): Promise<void> };

/**
 * Use case : un admin déclare un jour férié ou un congé (un jour ou une plage, éventuellement annuel).
 * Bloque automatiquement la prise de RDV sur ces dates (voir GetAvailableSlots).
 *
 * Un congé posé sur des rendez-vous déjà pris les laisserait en place sans que personne ne s'en aperçoive :
 * le use case REFUSE donc de créer tant que l'admin n'a pas choisi (annuler les rendez-vous, ou les ignorer).
 * La vérification est ici, pas seulement dans l'interface : un rendez-vous réservé entre l'aperçu et la
 * validation doit encore être détecté.
 */
export class CreateHoliday {
  constructor(
    private readonly holidayRepository: HolidayRepository,
    private readonly conflictFinder: FindHolidayConflicts,
    private readonly appointmentCanceller: AppointmentCanceller,
    private readonly auditLogger: AuditLogger,
  ) {}

  async execute(input: CreateHolidayInput): Promise<CreateHolidayResult> {
    const endDate = input.endDate ?? input.date;
    const conflicts = await this.conflictFinder.execute({ date: input.date, endDate, isRecurring: input.isRecurring });

    if (conflicts.length > 0 && !input.resolution) {
      throw new DomainError('Des rendez-vous existent sur cette période.', 'HOLIDAY_CONFLICTS');
    }

    // Le congé est créé AVANT les annulations : dès cet instant, plus personne ne peut réserver ces jours-là.
    const holiday = await this.holidayRepository.save(
      new Holiday('', input.date, input.label, input.isRecurring, endDate),
    );

    let cancelledCount = 0;
    let failedCount = 0;
    if (input.resolution?.mode === 'cancel') {
      for (const { appointment } of conflicts) {
        try {
          await this.appointmentCanceller.execute({
            appointmentId: appointment.id,
            actorId: input.actorId,
            actorRole: input.actorRole,
            reason: input.resolution.reason ?? null,
          });
          cancelledCount++;
        } catch {
          // Un échec isolé ne doit pas laisser le reste des rendez-vous en place : on poursuit et on le signale.
          failedCount++;
        }
      }
    }

    await this.auditLogger.log({
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: AuditAction.HOLIDAY_CREATED,
      targetType: 'holiday',
      targetId: holiday.id,
      metadata: {
        label: holiday.label,
        isRecurring: holiday.isRecurring,
        endDate: holiday.endDate,
        conflicts: conflicts.length,
        resolution: conflicts.length > 0 ? (input.resolution?.mode ?? null) : null,
        cancelled: cancelledCount,
        failed: failedCount,
      },
    });

    return {
      holiday,
      ignoredCount: input.resolution?.mode === 'ignore' ? conflicts.length : 0,
      cancelledCount,
      failedCount,
    };
  }
}
