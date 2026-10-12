// src/domain/appointment/AdminAppointmentBooker.ts
import type { Appointment } from './Appointment';

/**
 * Créneau d'un rendez-vous créé par l'équipe : un créneau libre existant, ou un créneau ponctuel
 * (sur mesure) créé pour l'occasion et réservé aussitôt.
 */
export type SlotSelection =
  | { kind: 'existing'; slotId: string }
  | { kind: 'adHoc'; date: string; startTime: string; endTime: string };

export type AdminBookingRequest = {
  serviceId: string;
  subServiceId: string | null;
  slot: SlotSelection;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string | null;
};

/**
 * Port de sortie : réservation atomique d'un créneau ET création du rendez-vous confirmé.
 *
 * Distinct de `AppointmentRepository` et `SlotRepository` (ISP) : l'opération couvre deux
 * agrégats qui doivent réussir ou échouer ensemble. Les implémentations garantissent
 * l'atomicité (transaction) et l'anti-double-réservation.
 *
 * Erreurs métier : `SLOT_UNAVAILABLE` (créneau pris, ou doublon exact), `SERVICE_NOT_FOUND`,
 * `SUB_SERVICE_NOT_FOUND`.
 */
export interface AdminAppointmentBooker {
  bookConfirmed(request: AdminBookingRequest): Promise<Appointment>;
}
