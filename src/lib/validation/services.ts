// src/lib/validation/services.ts
import { z } from 'zod';
import { MAX_SLUG_LENGTH, isValidSlug } from '@/domain/shared/Slug';
import { MEDIA_LIMITS } from '@/domain/service/MediaRules';

/**
 * Schémas de la gestion du catalogue (P3). Partagés entre les formulaires (zodResolver) et les
 * Server Actions ; les messages sont des CLÉS (cf. ./messages.ts), jamais des phrases.
 */

const SHORT_TEXT_MAX = 120;
const SHORT_DESCRIPTION_MAX = 300;
const LONG_TEXT_MAX = 4000;

/**
 * Texte traduisible : le français est obligatoire, EN/DE restent facultatifs (chaîne vide acceptée,
 * le domaine la retire à la normalisation pour permettre le repli sur le français).
 */
const i18nField = (max: number) =>
  z.object({
    fr: z.string().trim().min(1, { error: 'frRequired' }).max(max, { error: 'textTooLong' }),
    en: z.string().trim().max(max, { error: 'textTooLong' }).optional(),
    de: z.string().trim().max(max, { error: 'textTooLong' }).optional(),
  });

/** Nom d'une icône Lucide (PascalCase) ; l'existence réelle de l'icône est vérifiée par le sélecteur côté UI. */
const iconSchema = z.string().regex(/^[A-Z][A-Za-z0-9]{0,47}$/, { error: 'iconInvalid' });

/**
 * Slug facultatif : une chaîne vide (champ laissé vide dans le formulaire) est acceptée et signifie
 * « dériver du nom français » ; toute autre valeur doit être un slug valide.
 */
const slugSchema = z
  .string()
  .trim()
  .max(MAX_SLUG_LENGTH, { error: 'slugInvalid' })
  .refine((value) => value === '' || isValidSlug(value), { error: 'slugInvalid' });

const idSchema = (error: string) => z.uuid({ error });

/** Ordre fourni par le glisser-déposer : une liste d'identifiants sans doublon. */
const orderedIdsSchema = z
  .array(idSchema('invalid'))
  .min(1, { error: 'invalid' })
  .max(200, { error: 'invalid' })
  .refine((ids) => new Set(ids).size === ids.length, { error: 'invalid' });

const serviceContentShape = {
  name: i18nField(SHORT_TEXT_MAX),
  shortDescription: i18nField(SHORT_DESCRIPTION_MAX),
  fullDescription: i18nField(LONG_TEXT_MAX),
  icon: iconSchema,
};

export const createServiceSchema = z.object({
  ...serviceContentShape,
  /** Facultatif : dérivé du nom français. */
  slug: slugSchema.optional(),
});

export const updateServiceSchema = z.object({
  serviceId: idSchema('serviceInvalid'),
  ...serviceContentShape,
});

export const serviceIdSchema = z.object({ serviceId: idSchema('serviceInvalid') });

export const reorderServicesSchema = z.object({ orderedIds: orderedIdsSchema });

const subServiceContentShape = {
  name: i18nField(SHORT_TEXT_MAX),
  description: i18nField(SHORT_DESCRIPTION_MAX),
};

export const createSubServiceSchema = z.object({
  serviceId: idSchema('serviceInvalid'),
  ...subServiceContentShape,
  slug: slugSchema.optional(),
});

export const updateSubServiceSchema = z.object({
  subServiceId: idSchema('subServiceInvalid'),
  ...subServiceContentShape,
});

export const subServiceIdSchema = z.object({ subServiceId: idSchema('subServiceInvalid') });

export const reorderSubServicesSchema = z.object({
  serviceId: idSchema('serviceInvalid'),
  orderedIds: orderedIdsSchema,
});

const mediaKindSchema = z.enum(['image', 'video'], { error: 'mediaInvalid' });

export const authorizeMediaUploadSchema = z.object({
  serviceId: idSchema('serviceInvalid'),
  kind: mediaKindSchema,
  mimeType: z.string().max(100, { error: 'mediaInvalid' }),
  // Borne haute absolue ; le plafond par type (10 / 100 Mo) est appliqué par le domaine.
  sizeBytes: z
    .number({ error: 'mediaInvalid' })
    .int({ error: 'mediaInvalid' })
    .positive({ error: 'mediaInvalid' })
    .max(MEDIA_LIMITS.video.maxBytes, { error: 'mediaInvalid' }),
});

export const attachServiceMediaSchema = z.object({
  serviceId: idSchema('serviceInvalid'),
  kind: mediaKindSchema,
  publicId: z.string().min(1, { error: 'mediaInvalid' }).max(300, { error: 'mediaInvalid' }),
});

export const mediaIdSchema = z.object({ mediaId: idSchema('mediaInvalid') });

export const reorderServiceMediaSchema = z.object({
  serviceId: idSchema('serviceInvalid'),
  orderedIds: orderedIdsSchema,
});

/** Schéma de formulaire d'une sous-prestation (sans identifiants : ils sont portés par le contexte). */
export const subServiceFormSchema = z.object(subServiceContentShape);

/** Valeurs de formulaire (saisie : EN/DE peuvent être absents). */
export type ServiceFormValues = z.input<typeof createServiceSchema>;
export type SubServiceFormValues = z.input<typeof subServiceFormSchema>;
