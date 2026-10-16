// src/domain/appointment/ClientAppointmentAccess.ts
import { AppointmentStatus, type Appointment } from './Appointment';
import { wallClockToInstant } from '../shared/IsoDate';

export type ClientAppointmentSlot = {
  id: string;
  /** Format ISO « AAAA-MM-JJ ». */
  date: string;
  /** Format « HH:mm » ou « HH:mm:ss » selon la source. */
  startTime: string;
  endTime: string;
};

/** Un rendez-vous tel que son client le consulte : l'entité et son créneau. */
export type ClientAppointmentView = {
  appointment: Appointment;
  slot: ClientAppointmentSlot;
};

/**
 * Port de sortie : accès d'un client à SON rendez-vous grâce au jeton secret reçu par email.
 *
 * Le jeton est la seule preuve d'identité : une implémentation ne renvoie jamais autre chose
 * que le rendez-vous qu'il désigne, et `null` (jamais d'erreur distincte) pour un jeton inconnu,
 * afin de ne rien révéler sur l'existence d'un rendez-vous.
 */
export interface ClientAppointmentAccess {
  findByToken(token: string): Promise<ClientAppointmentView | null>;
}

/**
 * - `active` : à venir et non annulé, le client peut l'annuler ou le déplacer ;
 * - `cancelled` : déjà annulé (par lui, par l'équipe, ou via un congé) ;
 * - `past` : le créneau a commencé, plus rien ne peut changer.
 */
export type ClientAppointmentState = 'active' | 'cancelled' | 'past';

/**
 * État d'un rendez-vous du point de vue du client. L'annulation prime sur le passé : un rendez-vous
 * annulé affiche « annulé » même une fois son créneau écoulé.
 */
export function clientAppointmentState(
  status: AppointmentStatus,
  slot: Pick<ClientAppointmentSlot, 'date' | 'startTime'>,
  now: Date,
): ClientAppointmentState {
  if (status === AppointmentStatus.CANCELLED) return 'cancelled';
  return wallClockToInstant(slot.date, slot.startTime).getTime() <= now.getTime() ? 'past' : 'active';
}
