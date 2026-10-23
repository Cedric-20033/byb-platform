// src/domain/appointment/AppointmentRescheduler.ts

/**
 * Port de sortie : déplacer un rendez-vous vers un autre créneau.
 *
 * L'opération touche deux créneaux et le rendez-vous : elle doit réussir ou échouer d'un bloc,
 * sans quoi un créneau resterait réservé pour personne (ou un rendez-vous sans créneau).
 * Les implémentations garantissent l'atomicité et l'anti-double-réservation.
 *
 * Erreurs métier : `APPOINTMENT_NOT_FOUND`, `INVALID_STATUS_TRANSITION` (rendez-vous annulé),
 * `SLOT_UNAVAILABLE` (nouveau créneau pris, d'un autre service, ou identique à l'actuel).
 */
export interface AppointmentRescheduler {
  reschedule(appointmentId: string, newSlotId: string): Promise<void>;
}
