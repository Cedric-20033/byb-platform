// src/domain/settings/CompanySettingsRules.ts
import { DomainError } from '../shared/DomainError';
import { normalizeI18nText, type I18nTextInput } from '../shared/I18nText';
import type { BookingSettings, CompanySettings, CompanySite } from './CompanySettings';
import { BOOKING_CONFIRMATION_MODES } from './CompanySettings';

/** Bornes alignées sur les contraintes `check` de la migration 0022. */
export const SETTINGS_LIMITS = {
  minNoticeMinutes: { min: 0, max: 10_080 },
  horizonDays: { min: 1, max: 365 },
  maxUpcomingPerEmail: { min: 1, max: 20 },
  slotMinutes: { min: 15, max: 480 },
  sites: { min: 1, max: 5 },
} as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
// Volontairement simple : l'adresse sera de toute façon éprouvée à la première notification envoyée.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Saisie brute : les champs de texte peuvent contenir des espaces superflus, les traductions être vides. */
export type CompanySiteInput = Omit<CompanySite, 'country'> & { country: I18nTextInput };
export type CompanySettingsInput = Omit<CompanySettings, 'openingHours' | 'sites'> & {
  openingHours: I18nTextInput;
  sites: CompanySiteInput[];
};

function invalid(message: string): never {
  throw new DomainError(message, 'SETTINGS_INVALID');
}

function inRange(value: number, { min, max }: { min: number; max: number }): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

/** Chaîne vide (champ non renseigné) ou URL http(s) complète. */
function normalizeUrl(raw: string, label: string): string {
  const value = raw.trim();
  if (!value) return '';
  try {
    const { protocol } = new URL(value);
    if (protocol === 'https:' || protocol === 'http:') return value;
  } catch {
    // Tombe dans l'erreur ci-dessous.
  }
  return invalid(`${label} : URL invalide.`);
}

function normalizeSite(input: CompanySiteInput): CompanySite {
  const site = {
    id: input.id.trim(),
    name: input.name.trim(),
    isPrimary: input.isPrimary,
    street: input.street.trim(),
    postalCode: input.postalCode.trim(),
    city: input.city.trim(),
    country: normalizeI18nText(input.country),
  };
  if (!site.id || !site.name || !site.street || !site.postalCode || !site.city) {
    invalid('Un site doit avoir un nom, une rue, un code postal et une ville.');
  }
  return site;
}

function normalizeSites(inputs: CompanySiteInput[]): CompanySite[] {
  if (!inRange(inputs.length, SETTINGS_LIMITS.sites)) {
    invalid(`Il faut entre ${SETTINGS_LIMITS.sites.min} et ${SETTINGS_LIMITS.sites.max} sites.`);
  }
  const sites = inputs.map(normalizeSite);

  if (new Set(sites.map((site) => site.id)).size !== sites.length) invalid('Identifiants de site en double.');
  // Exactement un site principal : zéro laisserait le site public sans adresse mise en avant, plusieurs sont ambigus.
  if (sites.filter((site) => site.isPrimary).length !== 1) invalid('Un seul site doit être principal.');
  return sites;
}

function normalizeBooking(booking: BookingSettings): BookingSettings {
  if (
    !inRange(booking.minNoticeMinutes, SETTINGS_LIMITS.minNoticeMinutes) ||
    !inRange(booking.horizonDays, SETTINGS_LIMITS.horizonDays) ||
    !inRange(booking.maxUpcomingPerEmail, SETTINGS_LIMITS.maxUpcomingPerEmail) ||
    !inRange(booking.defaultSlotMinutes, SETTINGS_LIMITS.slotMinutes)
  ) {
    invalid('Paramètre de réservation hors des bornes autorisées.');
  }
  if (!BOOKING_CONFIRMATION_MODES.includes(booking.confirmationMode)) invalid('Mode de confirmation inconnu.');
  if (!TIME_PATTERN.test(booking.defaultStartTime) || !TIME_PATTERN.test(booking.defaultEndTime)) {
    invalid('Horaire invalide (format HH:mm).');
  }
  // « HH:mm » : l'ordre lexicographique est l'ordre chronologique.
  if (booking.defaultStartTime >= booking.defaultEndTime) invalid("L'heure de début doit précéder l'heure de fin.");
  return { ...booking };
}

function normalizeEmail(raw: string, label: string): string {
  const value = raw.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(value)) invalid(`${label} : adresse email invalide.`);
  return value;
}

/**
 * Valide et normalise une saisie de réglages : retire les espaces, impose les invariants (un seul site
 * principal, bornes de réservation, plages horaires ordonnées) quel que soit l'appelant. Les schémas Zod
 * du formulaire ne sont que la première barrière, avec des messages traduits.
 */
export function normalizeCompanySettings(input: CompanySettingsInput): CompanySettings {
  return {
    phone: input.phone.trim(),
    mobile: input.mobile.trim(),
    email: normalizeEmail(input.email, 'Email de contact'),
    website: normalizeUrl(input.website, 'Site web'),
    facebookUrl: normalizeUrl(input.facebookUrl, 'Facebook'),
    instagramUrl: normalizeUrl(input.instagramUrl, 'Instagram'),
    linkedinUrl: normalizeUrl(input.linkedinUrl, 'LinkedIn'),
    openingHours: normalizeI18nText(input.openingHours),
    sites: normalizeSites(input.sites),
    adminNotificationEmail: normalizeEmail(input.adminNotificationEmail, 'Email de notification'),
    booking: normalizeBooking(input.booking),
  };
}

/** Champs de premier niveau (et de `booking`) dont la valeur diffère : contenu de la trace d'audit. */
export function changedSettingsFields(before: CompanySettings, after: CompanySettings): string[] {
  const changed: string[] = [];
  for (const key of Object.keys(after) as (keyof CompanySettings)[]) {
    if (key === 'booking') continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) changed.push(key);
  }
  for (const key of Object.keys(after.booking) as (keyof BookingSettings)[]) {
    if (before.booking[key] !== after.booking[key]) changed.push(`booking.${key}`);
  }
  return changed;
}
