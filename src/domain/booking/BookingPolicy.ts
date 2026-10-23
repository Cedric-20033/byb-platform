// src/domain/booking/BookingPolicy.ts
import { DomainError } from '../shared/DomainError';
import { addDays, toIsoDate, wallClockToInstant } from '../shared/IsoDate';

/**
 * Règles de réservation publique, validées côté serveur : le wizard n'affiche que des créneaux
 * raisonnables, mais rien n'empêche un appel direct à l'action avec n'importe quel identifiant.
 */
export type BookingPolicy = {
  /** Délai minimal entre maintenant et le début du créneau. */
  minNoticeMinutes: number;
  /** Au-delà de ce nombre de jours, le créneau n'est pas encore ouvert à la réservation. */
  horizonDays: number;
  /** Rendez-vous actifs à venir qu'une même adresse email peut détenir. */
  maxUpcomingPerEmail: number;
  /**
   * Confirme les demandes dès la réservation. Absent = confirmation manuelle par l'équipe, ce qui garde
   * `DEFAULT_BOOKING_POLICY` identique à l'existant.
   */
  autoConfirm?: boolean;
};

/**
 * Valeurs de repli quand les réglages de l'entreprise (table `company_settings`, P6.4) ne sont pas
 * encore enregistrés ou illisibles : le use case reçoit la politique en paramètre, la composition
 * lui fournit celle lue en base.
 */
export const DEFAULT_BOOKING_POLICY: BookingPolicy = {
  minNoticeMinutes: 120,
  horizonDays: 90,
  maxUpcomingPerEmail: 3,
};

/**
 * Refuse un créneau déjà commencé, trop proche ou trop lointain.
 * `startTime` accepte « HH:mm » ou « HH:mm:ss » (format de la base).
 */
export function assertSlotBookable(
  slot: { date: string; startTime: string },
  now: Date,
  policy: BookingPolicy,
): void {
  const start = wallClockToInstant(slot.date, slot.startTime);

  if (start.getTime() <= now.getTime()) {
    throw new DomainError('Ce créneau est déjà passé.', 'SLOT_IN_PAST');
  }
  if (start.getTime() - now.getTime() < policy.minNoticeMinutes * 60_000) {
    throw new DomainError('Ce créneau est trop proche pour être réservé en ligne.', 'SLOT_TOO_SOON');
  }
  // Comparaison de jours calendaires belges : l'ordre lexicographique « AAAA-MM-JJ » est chronologique.
  if (slot.date > addDays(toIsoDate(now), policy.horizonDays)) {
    throw new DomainError("Ce créneau n'est pas encore ouvert à la réservation.", 'SLOT_TOO_FAR');
  }
}
