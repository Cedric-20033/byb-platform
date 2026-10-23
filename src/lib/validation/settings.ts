// src/lib/validation/settings.ts
import { z } from 'zod';
import { BOOKING_CONFIRMATION_MODES } from '@/domain/settings/CompanySettings';
import { SETTINGS_LIMITS } from '@/domain/settings/CompanySettingsRules';
import { PHONE_PATTERN } from './appointment';

/**
 * Schémas des réglages de l'entreprise (P6.4). Partagés entre le formulaire (zodResolver) et la Server
 * Action ; les messages sont des CLÉS (cf. ./messages.ts), jamais des phrases. Le domaine
 * (`normalizeCompanySettings`) revalide les invariants : ceci est la première barrière, pas la seule.
 */

const SHORT_MAX = 150;
const HOURS_MAX = 500;

const requiredText = (max = SHORT_MAX) =>
  z.string().trim().min(1, { error: 'fieldRequired' }).max(max, { error: 'textTooLong' });

const emailField = z.string().trim().pipe(z.email({ error: 'emailInvalid' }));

/** Vide (non renseigné) ou numéro permissif, comme le formulaire de réservation. */
const optionalPhone = z
  .string()
  .trim()
  .refine((value) => value === '' || PHONE_PATTERN.test(value), { error: 'phoneInvalid' });

/** Vide (lien masqué) ou URL http(s) complète. */
const optionalUrl = z
  .string()
  .trim()
  .max(300, { error: 'textTooLong' })
  .refine(
    (value) => {
      if (value === '') return true;
      try {
        const { protocol } = new URL(value);
        return protocol === 'https:' || protocol === 'http:';
      } catch {
        return false;
      }
    },
    { error: 'linkInvalid' },
  );

/** Texte traduisible : français obligatoire, EN/DE facultatifs. */
const i18nField = (max: number) =>
  z.object({
    fr: z.string().trim().min(1, { error: 'frRequired' }).max(max, { error: 'textTooLong' }),
    en: z.string().trim().max(max, { error: 'textTooLong' }).optional(),
    de: z.string().trim().max(max, { error: 'textTooLong' }).optional(),
  });

const siteSchema = z.object({
  id: z.string().trim().min(1, { error: 'invalid' }).max(64, { error: 'invalid' }),
  name: requiredText(),
  isPrimary: z.boolean(),
  street: requiredText(),
  postalCode: requiredText(20),
  city: requiredText(),
  country: i18nField(SHORT_MAX),
});

const integerIn = ({ min, max }: { min: number; max: number }) =>
  z.number({ error: 'rangeInvalid' }).int({ error: 'rangeInvalid' }).min(min, { error: 'rangeInvalid' }).max(max, { error: 'rangeInvalid' });

const timeField = (error: string) => z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error });

const bookingSchema = z
  .object({
    minNoticeMinutes: integerIn(SETTINGS_LIMITS.minNoticeMinutes),
    horizonDays: integerIn(SETTINGS_LIMITS.horizonDays),
    maxUpcomingPerEmail: integerIn(SETTINGS_LIMITS.maxUpcomingPerEmail),
    confirmationMode: z.enum(BOOKING_CONFIRMATION_MODES, { error: 'invalid' }),
    defaultSlotMinutes: integerIn(SETTINGS_LIMITS.slotMinutes),
    defaultStartTime: timeField('startTimeInvalid'),
    defaultEndTime: timeField('endTimeInvalid'),
  })
  .refine((booking) => booking.defaultStartTime < booking.defaultEndTime, {
    error: 'startTimeAfterEnd',
    path: ['defaultEndTime'],
  });

export const companySettingsSchema = z.object({
  phone: optionalPhone,
  mobile: optionalPhone,
  email: emailField,
  website: optionalUrl,
  facebookUrl: optionalUrl,
  instagramUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  openingHours: i18nField(HOURS_MAX),
  sites: z
    .array(siteSchema)
    .min(SETTINGS_LIMITS.sites.min, { error: 'sitesInvalid' })
    .max(SETTINGS_LIMITS.sites.max, { error: 'sitesInvalid' })
    // Exactement un site principal : même règle que le domaine, signalée ici sur le champ.
    .refine((sites) => sites.filter((site) => site.isPrimary).length === 1, { error: 'sitesInvalid' })
    .refine((sites) => new Set(sites.map((site) => site.id)).size === sites.length, { error: 'sitesInvalid' }),
  adminNotificationEmail: emailField,
  booking: bookingSchema,
});

/** Valeurs de formulaire (saisie : EN/DE peuvent être absents). */
export type CompanySettingsFormValues = z.input<typeof companySettingsSchema>;
