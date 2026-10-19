// src/domain/settings/CompanySettings.ts
import type { I18nText } from '../shared/I18nText';

/** Un établissement de l'entreprise. Le nom et la rue sont des noms propres : seul le pays se traduit. */
export type CompanySite = {
  /** Identifiant stable, généré à la création : sert de clé de liste et de repère pour l'audit. */
  id: string;
  name: string;
  /** Un seul site est principal : c'est lui que le site public met en avant. */
  isPrimary: boolean;
  street: string;
  postalCode: string;
  city: string;
  country: I18nText;
};

export const BOOKING_CONFIRMATION_MODES = ['manual', 'auto'] as const;

/**
 * `manual` : une nouvelle demande reste « en attente » jusqu'à ce que l'équipe la confirme.
 * `auto` : elle est confirmée dès la réservation.
 */
export type BookingConfirmationMode = (typeof BOOKING_CONFIRMATION_MODES)[number];

export type BookingSettings = {
  /** Délai minimal entre maintenant et le début d'un créneau réservable en ligne. */
  minNoticeMinutes: number;
  /** Jusqu'à combien de jours à l'avance on peut réserver. */
  horizonDays: number;
  /** Rendez-vous actifs à venir qu'une même adresse email peut détenir. */
  maxUpcomingPerEmail: number;
  confirmationMode: BookingConfirmationMode;
  /** Valeurs proposées par défaut à la génération de créneaux (« HH:mm »). */
  defaultSlotMinutes: number;
  defaultStartTime: string;
  defaultEndTime: string;
};

/**
 * Réglages éditables de l'entreprise (une seule instance). Une chaîne vide signifie « non renseigné » :
 * le site public masque alors la ligne ou le lien correspondant.
 */
export type CompanySettings = {
  phone: string;
  mobile: string;
  email: string;
  website: string;
  facebookUrl: string;
  instagramUrl: string;
  linkedinUrl: string;
  openingHours: I18nText;
  sites: CompanySite[];
  /** Destinataire des notifications internes (nouvelle demande, annulation, déplacement). */
  adminNotificationEmail: string;
  booking: BookingSettings;
};
