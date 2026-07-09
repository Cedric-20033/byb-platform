// src/domain/appointment/AppointmentWithSlot.ts
import type { Appointment } from './Appointment';

/**
 * Vue enrichie d'un rendez-vous avec les informations de créneau associées
 * (date, heure de début/fin). L'entité Appointment reste pure et ne connaît
 * pas cette notion — cette combinaison n'existe que pour les besoins de
 * lecture du dashboard admin (tableau, export, statistiques).
 */
export type AppointmentWithSlot = {
  appointment: Appointment;
  slotDate: string; // format ISO "YYYY-MM-DD"
  slotStartTime: string; // format "HH:mm"
  slotEndTime: string; // format "HH:mm"
};
