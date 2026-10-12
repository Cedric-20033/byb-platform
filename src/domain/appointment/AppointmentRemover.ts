// src/domain/appointment/AppointmentRemover.ts

/**
 * Port de sortie : supprimer définitivement un rendez-vous.
 *
 * Si le rendez-vous était actif (en attente ou confirmé), son créneau est libéré dans la même
 * transaction : supprimer sans libérer laisserait un créneau « réservé » à jamais. Un rendez-vous
 * déjà annulé a déjà libéré son créneau, qui peut avoir été repris depuis : on n'y touche pas.
 *
 * Erreur métier : `APPOINTMENT_NOT_FOUND`.
 */
export interface AppointmentRemover {
  remove(appointmentId: string): Promise<void>;
}
