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
 */

// Téléphone volontairement permissif (formats FR/BE avec ou sans indicatif).
const phoneSchema = z
  .string()
  .regex(/^[+]?[0-9\s.-]{8,20}$/, { error: 'Numéro de téléphone invalide.' });

export const createAppointmentSchema = z.object({
  slotId: z.uuid({ error: 'Créneau invalide.' }),
  serviceId: z.uuid({ error: 'Service invalide.' }),
  subServiceId: z.uuid({ error: 'Sous-prestation invalide.' }).optional(),
  clientName: z.string().min(2, { error: 'Le nom doit contenir au moins 2 caractères.' }).max(100),
  clientEmail: z.email({ error: 'Adresse email invalide.' }),
  clientPhone: phoneSchema,
  notes: z.string().max(500, { error: '500 caractères maximum.' }).optional(),
});

export type CreateAppointmentFormValues = z.infer<typeof createAppointmentSchema>;

/**
 * Annulation par le client via le lien reçu par email (token dans l'URL).
 */
export const cancelAppointmentByTokenSchema = z.object({
  token: z.uuid({ error: 'Lien invalide.' }),
});

export type CancelAppointmentByTokenValues = z.infer<typeof cancelAppointmentByTokenSchema>;

/**
 * Recherche de créneaux disponibles (étape "Choix du créneau" du wizard).
 */
export const getAvailableSlotsSchema = z
  .object({
    serviceId: z.uuid({ error: 'Service invalide.' }),
    from: z.iso.date({ error: 'Date de début invalide (format attendu : AAAA-MM-JJ).' }),
    to: z.iso.date({ error: 'Date de fin invalide (format attendu : AAAA-MM-JJ).' }),
  })
  .refine((data) => data.from <= data.to, {
    error: 'La date de début doit précéder la date de fin.',
    path: ['to'],
  });

export type GetAvailableSlotsValues = z.infer<typeof getAvailableSlotsSchema>;

/**
 * Blocage manuel d'un créneau par un admin.
 */
export const blockSlotSchema = z.object({
  slotId: z.uuid(),
});

export type BlockSlotValues = z.infer<typeof blockSlotSchema>;

/**
 * Génération en masse de créneaux réservables pour un service, sur une période
 * et des horaires donnés (voir GenerateAvailableSlots).
 */
export const generateAvailableSlotsSchema = z
  .object({
    serviceId: z.uuid({ error: 'Service invalide.' }),
    from: z.iso.date({ error: 'Date de début invalide (format attendu : AAAA-MM-JJ).' }),
    to: z.iso.date({ error: 'Date de fin invalide (format attendu : AAAA-MM-JJ).' }),
    dailyStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Heure de début invalide (HH:mm).' }),
    dailyEndTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: 'Heure de fin invalide (HH:mm).' }),
    slotDurationMinutes: z.number().int().min(15).max(480),
    workingDays: z.array(z.number().int().min(0).max(6)).optional(),
  })
  .refine((data) => data.from <= data.to, {
    error: 'La date de début doit précéder la date de fin.',
    path: ['to'],
  })
  .refine((data) => data.dailyStartTime < data.dailyEndTime, {
    error: "L'heure de début doit précéder l'heure de fin.",
    path: ['dailyEndTime'],
  });

export type GenerateAvailableSlotsValues = z.infer<typeof generateAvailableSlotsSchema>;

/**
 * Création d'un jour férié/congé par un admin.
 */
export const createHolidaySchema = z.object({
  date: z.iso.date({ error: 'Date invalide (format attendu : AAAA-MM-JJ).' }),
  label: z.string().min(2, { error: 'Le libellé doit contenir au moins 2 caractères.' }).max(100),
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
