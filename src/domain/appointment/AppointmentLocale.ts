// src/domain/appointment/AppointmentLocale.ts

/**
 * Langue dans laquelle un client a réservé : elle détermine celle des emails qu'il reçoit
 * (confirmation, annulation, déplacement), même plusieurs jours plus tard.
 * Même liste que les locales du site ; le domaine la porte lui-même pour ne pas dépendre de next-intl.
 */
export const APPOINTMENT_LOCALES = ['fr', 'en', 'de'] as const;

export type AppointmentLocale = (typeof APPOINTMENT_LOCALES)[number];

export const DEFAULT_APPOINTMENT_LOCALE: AppointmentLocale = 'fr';

/** Valeur inconnue ou absente (ancien rendez-vous, entrée non fiable) : repli sur le français. */
export function toAppointmentLocale(value: unknown): AppointmentLocale {
  return (APPOINTMENT_LOCALES as readonly unknown[]).includes(value) ? (value as AppointmentLocale) : DEFAULT_APPOINTMENT_LOCALE;
}
