// src/lib/validation/appointment.ts
import { z } from 'zod';
import { AppointmentStatus } from '@/domain/appointment/Appointment';

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
export const createHolidaySchema = z.object({
  date: z.iso.date({ error: 'dateInvalid' }),
  label: z.string().min(2, { error: 'labelTooShort' }).max(100, { error: 'labelTooLong' }),
  isRecurring: z.boolean().default(false),
});

export type CreateHolidayValues = z.infer<typeof createHolidaySchema>;

/**
 * Type côté formulaire (react-hook-form + zodResolver) : `isRecurring` y est
 * optionnel avant soumission, puisque `.default(false)` ne le rend obligatoire
 * qu'en sortie de validation (CreateHolidayValues), pas en saisie.
 */
export type CreateHolidayFormValues = z.input<typeof createHolidaySchema>;

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
