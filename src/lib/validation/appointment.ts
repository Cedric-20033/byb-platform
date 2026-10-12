// src/lib/validation/appointment.ts
import { z } from 'zod';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { APPOINTMENT_SORT_FIELDS } from '@/domain/appointment/AppointmentRepository';

/**
 * Schémas Zod partagés entre le formulaire front (wizard de réservation,
 * via zodResolver) et les use cases de src/application/. Une seule source
 * de vérité pour les règles de validation — jamais dupliquées.
 *
 * Syntaxe Zod v4 : formats de chaîne en fonctions top-level (z.email(), z.uuid())
 * plutôt que les méthodes chaînées dépréciées (z.string().email()).
 *
 * Les messages d'erreur sont des CLÉS (voir ./messages.ts), jamais des phrases :
 * le serveur les ignore (il renvoie `VALIDATION_FAILED`), les formulaires les
 * traduisent via `useValidationMessage()`.
 */

// Téléphone volontairement permissif (formats BE/FR avec ou sans indicatif).
const phoneSchema = z.string().regex(/^[+]?[0-9\s.-]{8,20}$/, { error: 'phoneInvalid' });

const timeSchema = (error: string) => z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error });

export const createAppointmentSchema = z.object({
  slotId: z.uuid({ error: 'slotInvalid' }),
  serviceId: z.uuid({ error: 'serviceInvalid' }),
  subServiceId: z.uuid({ error: 'subServiceInvalid' }).optional(),
  clientName: z.string().min(2, { error: 'nameTooShort' }).max(100, { error: 'nameTooLong' }),
  clientEmail: z.email({ error: 'emailInvalid' }),
  clientPhone: phoneSchema,
  notes: z.string().max(500, { error: 'notesTooLong' }).optional(),
});

export type CreateAppointmentFormValues = z.infer<typeof createAppointmentSchema>;

/**
 * Annulation par le client via le lien reçu par email (token dans l'URL).
 */
export const cancelAppointmentByTokenSchema = z.object({
  token: z.uuid({ error: 'linkInvalid' }),
});

export type CancelAppointmentByTokenValues = z.infer<typeof cancelAppointmentByTokenSchema>;

/**
 * Recherche de créneaux disponibles (étape "Choix du créneau" du wizard).
 */
export const getAvailableSlotsSchema = z
  .object({
    serviceId: z.uuid({ error: 'serviceInvalid' }),
    from: z.iso.date({ error: 'startDateInvalid' }),
    to: z.iso.date({ error: 'endDateInvalid' }),
  })
  .refine((data) => data.from <= data.to, {
    error: 'startDateAfterEnd',
    path: ['to'],
  });

export type GetAvailableSlotsValues = z.infer<typeof getAvailableSlotsSchema>;

/**
 * Blocage manuel d'un créneau par un admin.
 */
export const blockSlotSchema = z.object({
  slotId: z.uuid({ error: 'slotInvalid' }),
});

export type BlockSlotValues = z.infer<typeof blockSlotSchema>;

/**
 * Génération en masse de créneaux réservables pour un service, sur une période
 * et des horaires donnés (voir GenerateAvailableSlots).
 */
export const generateAvailableSlotsSchema = z
  .object({
    serviceId: z.uuid({ error: 'serviceInvalid' }),
    from: z.iso.date({ error: 'startDateInvalid' }),
    to: z.iso.date({ error: 'endDateInvalid' }),
    dailyStartTime: timeSchema('startTimeInvalid'),
    dailyEndTime: timeSchema('endTimeInvalid'),
    slotDurationMinutes: z
      .number({ error: 'durationInvalid' })
      .int({ error: 'durationInvalid' })
      .min(15, { error: 'durationInvalid' })
      .max(480, { error: 'durationInvalid' }),
    workingDays: z.array(z.number().int().min(0).max(6)).optional(),
  })
  .refine((data) => data.from <= data.to, {
    error: 'startDateAfterEnd',
    path: ['to'],
  })
  .refine((data) => data.dailyStartTime < data.dailyEndTime, {
    error: 'startTimeAfterEnd',
    path: ['dailyEndTime'],
  });

export type GenerateAvailableSlotsValues = z.infer<typeof generateAvailableSlotsSchema>;

/**
 * Création d'un jour férié/congé par un admin.
 */
export const createHolidaySchema = z
  .object({
    date: z.iso.date({ error: 'dateInvalid' }),
    /** Dernier jour inclus d'un congé sur plusieurs jours ; absent = un seul jour. */
    endDate: z.iso.date({ error: 'dateInvalid' }).optional(),
    label: z.string().min(2, { error: 'labelTooShort' }).max(100, { error: 'labelTooLong' }),
    isRecurring: z.boolean().default(false),
  })
  .refine((holiday) => !holiday.endDate || holiday.endDate >= holiday.date, {
    error: 'startDateAfterEnd',
    path: ['endDate'],
  })
  // Une plage annuelle se répète aux mêmes mois/jour : elle ne peut pas chevaucher deux années (contrainte de base aussi).
  .refine((holiday) => !(holiday.isRecurring && holiday.endDate && holiday.endDate.slice(0, 4) !== holiday.date.slice(0, 4)), {
    error: 'endDateInvalid',
    path: ['endDate'],
  });

export type CreateHolidayValues = z.infer<typeof createHolidaySchema>;

/**
 * Type côté formulaire (react-hook-form + zodResolver) : `isRecurring` y est
 * optionnel avant soumission, puisque `.default(false)` ne le rend obligatoire
 * qu'en sortie de validation (CreateHolidayValues), pas en saisie.
 */
export type CreateHolidayFormValues = z.input<typeof createHolidaySchema>;

/** Décision de l'admin pour les rendez-vous déjà pris sur la période d'un congé. */
export const holidayConflictResolutionSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('ignore') }),
  z.object({ mode: z.literal('cancel'), reason: z.string().trim().max(500, { error: 'notesTooLong' }).optional() }),
]);

export type HolidayConflictResolutionValues = z.infer<typeof holidayConflictResolutionSchema>;

/** Création d'un congé, avec la résolution des conflits quand l'admin en a choisi une. */
export const createHolidayRequestSchema = z.object({
  holiday: createHolidaySchema,
  resolution: holidayConflictResolutionSchema.optional(),
});

export type CreateHolidayRequestValues = z.input<typeof createHolidayRequestSchema>;

/** Import des jours fériés belges d'une année ; `locale` détermine la langue des libellés enregistrés. */
export const importBelgianHolidaysSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  locale: z.string().min(2).max(5),
});

export type ImportBelgianHolidaysValues = z.infer<typeof importBelgianHolidaysSchema>;

/**
 * Filtres de recherche du dashboard admin (liste des rendez-vous).
 * Tous les champs sont optionnels — un objet vide retourne tout.
 */
export const appointmentSearchFiltersSchema = z.object({
  // z.enum() sur l'enum du domaine (pas une liste de chaînes recopiée à la main) :
  // le statut reste garanti aligné avec AppointmentStatus si celui-ci évolue.
  status: z.enum(AppointmentStatus).optional(),
  serviceId: z.uuid().optional(),
  clientEmail: z.email().optional(),
  /** Texte libre cherché dans le nom, l'email et le téléphone ; borné pour ne pas générer de motifs démesurés. */
  query: z.string().trim().max(100).optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
});

export type AppointmentSearchFiltersValues = z.infer<typeof appointmentSearchFiltersSchema>;

/**
 * Annulation d'un RDV par un admin, avec message optionnel envoyé au client.
 */
export const cancelAppointmentSchema = z.object({
  appointmentId: z.uuid({ error: 'appointmentInvalid' }),
  reason: z.string().max(500, { error: 'notesTooLong' }).optional(),
});

export type CancelAppointmentValues = z.infer<typeof cancelAppointmentSchema>;

/**
 * Coordonnées du client saisies par l'équipe : exactement les règles du formulaire public
 * (mêmes champs, mêmes messages), extraites du schéma de réservation pour ne jamais diverger.
 */
export const appointmentClientSchema = createAppointmentSchema.pick({
  clientName: true,
  clientEmail: true,
  clientPhone: true,
  notes: true,
});

export type AppointmentClientValues = z.infer<typeof appointmentClientSchema>;

/**
 * Créneau d'un rendez-vous créé par l'équipe : un créneau libre existant, ou un créneau
 * ponctuel (date + horaires) créé pour l'occasion.
 */
export const slotSelectionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('existing'), slotId: z.uuid({ error: 'slotInvalid' }) }),
  z
    .object({
      kind: z.literal('adHoc'),
      date: z.iso.date({ error: 'dateInvalid' }),
      startTime: timeSchema('startTimeInvalid'),
      endTime: timeSchema('endTimeInvalid'),
    })
    .refine((slot) => slot.startTime < slot.endTime, { error: 'startTimeAfterEnd', path: ['endTime'] }),
]);

/**
 * Création manuelle d'un rendez-vous par un admin (confirmé d'office).
 * La règle « pas dans le passé » dépend de l'heure courante : elle est portée par le use case (Clock).
 */
export const createAppointmentByAdminSchema = appointmentClientSchema.extend({
  serviceId: z.uuid({ error: 'serviceInvalid' }),
  subServiceId: z.uuid({ error: 'subServiceInvalid' }).optional(),
  slot: slotSelectionSchema,
});

export type CreateAppointmentByAdminValues = z.infer<typeof createAppointmentByAdminSchema>;

/** Plafond de la période d'un calendrier : une vue mois couvre au plus 6 semaines, la marge absorbe les fuseaux. */
export const MAX_CALENDAR_RANGE_DAYS = 62;

/**
 * Requête de la liste paginée des rendez-vous : filtres, page et tri. La taille de page n'en fait pas
 * partie, elle est fixée côté serveur. Chaque champ a une valeur par défaut : un objet vide est valide.
 */
export const appointmentListQuerySchema = z.object({
  filters: appointmentSearchFiltersSchema.default({}),
  page: z.number().int().min(1).max(10_000).default(1),
  sort: z.enum(APPOINTMENT_SORT_FIELDS).default('slotDate'),
  direction: z.enum(['asc', 'desc']).default('desc'),
});

export type AppointmentListQueryValues = z.infer<typeof appointmentListQuerySchema>;

/** Déplacement d'un rendez-vous vers un autre créneau libre du même service. */
export const rescheduleAppointmentSchema = z.object({
  appointmentId: z.uuid({ error: 'appointmentInvalid' }),
  newSlotId: z.uuid({ error: 'slotInvalid' }),
});

export type RescheduleAppointmentValues = z.infer<typeof rescheduleAppointmentSchema>;

/** Correction des coordonnées et des notes : mêmes règles que la réservation publique. */
export const updateAppointmentDetailsSchema = appointmentClientSchema.extend({
  appointmentId: z.uuid({ error: 'appointmentInvalid' }),
});

export type UpdateAppointmentDetailsValues = z.infer<typeof updateAppointmentDetailsSchema>;

/** Période affichée par le calendrier admin. */
export const calendarRangeSchema = z
  .object({
    from: z.iso.date({ error: 'startDateInvalid' }),
    to: z.iso.date({ error: 'endDateInvalid' }),
  })
  .refine((range) => range.from <= range.to, { error: 'startDateAfterEnd', path: ['to'] })
  .refine((range) => (Date.parse(range.to) - Date.parse(range.from)) / 86_400_000 <= MAX_CALENDAR_RANGE_DAYS, {
    error: 'endDateInvalid',
    path: ['to'],
  });

export type CalendarRangeValues = z.infer<typeof calendarRangeSchema>;

/** Plafonds de période : une opération de masse couvre au plus un an, une vue semaine ou mois au plus un mois et demi. */
export const MAX_SLOT_BULK_RANGE_DAYS = 366;
export const MAX_SLOT_LIST_RANGE_DAYS = 31;

const daysBetween = (range: { from: string; to: string }) => (Date.parse(range.to) - Date.parse(range.from)) / 86_400_000;

/** Périmètre commun aux opérations de masse sur les créneaux : une période, pour un service ou pour tous. */
const slotScopeShape = {
  from: z.iso.date({ error: 'startDateInvalid' }),
  to: z.iso.date({ error: 'endDateInvalid' }),
  serviceId: z.uuid({ error: 'serviceInvalid' }).optional(),
};

/** Blocage en lot : les créneaux libres d'une période, éventuellement sur une plage horaire. */
export const blockSlotsInRangeSchema = z
  .object({
    ...slotScopeShape,
    startTime: timeSchema('startTimeInvalid').optional(),
    endTime: timeSchema('endTimeInvalid').optional(),
  })
  .refine((scope) => scope.from <= scope.to, { error: 'startDateAfterEnd', path: ['to'] })
  .refine((scope) => daysBetween(scope) <= MAX_SLOT_BULK_RANGE_DAYS, { error: 'endDateInvalid', path: ['to'] })
  // Une fenêtre horaire a deux bornes : une seule n'a pas de sens.
  .refine((scope) => Boolean(scope.startTime) === Boolean(scope.endTime), { error: 'endTimeInvalid', path: ['endTime'] })
  .refine((scope) => !scope.startTime || !scope.endTime || scope.startTime < scope.endTime, {
    error: 'startTimeAfterEnd',
    path: ['endTime'],
  });

export type BlockSlotsInRangeValues = z.infer<typeof blockSlotsInRangeSchema>;

/** Suppression en lot des créneaux libres à venir d'une période. */
export const deleteAvailableSlotsSchema = z
  .object(slotScopeShape)
  .refine((scope) => scope.from <= scope.to, { error: 'startDateAfterEnd', path: ['to'] })
  .refine((scope) => daysBetween(scope) <= MAX_SLOT_BULK_RANGE_DAYS, { error: 'endDateInvalid', path: ['to'] });

export type DeleteAvailableSlotsValues = z.infer<typeof deleteAvailableSlotsSchema>;

/** Lecture des créneaux d'une période courte (vue semaine). */
export const listSlotsByRangeSchema = z
  .object(slotScopeShape)
  .refine((scope) => scope.from <= scope.to, { error: 'startDateAfterEnd', path: ['to'] })
  .refine((scope) => daysBetween(scope) <= MAX_SLOT_LIST_RANGE_DAYS, { error: 'endDateInvalid', path: ['to'] });

export type ListSlotsByRangeValues = z.infer<typeof listSlotsByRangeSchema>;
