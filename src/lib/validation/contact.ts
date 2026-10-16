// src/lib/validation/contact.ts
import { z } from 'zod';
import { APPOINTMENT_LOCALES } from '@/domain/appointment/AppointmentLocale';
import { PHONE_PATTERN } from './appointment';

/**
 * Formulaire de contact public. Même principe que le reste : ce schéma est partagé entre le formulaire
 * (zodResolver) et la Server Action, et ses messages sont des CLÉS (voir ./messages.ts), traduites par
 * `useValidationMessage()`.
 *
 * Les bornes protègent la boîte de l'équipe autant que le formulaire : un message sans limite de taille
 * serait un moyen gratuit de la saturer.
 */
export const contactMessageSchema = z.object({
  firstName: z.string().trim().min(2, { error: 'nameTooShort' }).max(100, { error: 'nameTooLong' }),
  lastName: z.string().trim().min(2, { error: 'nameTooShort' }).max(100, { error: 'nameTooLong' }),
  email: z.email({ error: 'emailInvalid' }).max(254, { error: 'emailInvalid' }),
  // Facultatif : un champ laissé vide arrive en chaîne vide, pas en `undefined`. Un `refine` plutôt qu'une union :
  // l'erreur d'une union est générique, elle ferait perdre la clé `phoneInvalid` que l'interface traduit.
  phone: z
    .string()
    .refine((value) => value === '' || PHONE_PATTERN.test(value), { error: 'phoneInvalid' })
    .optional(),
  subject: z
    .string()
    .trim()
    .min(3, { error: 'subjectTooShort' })
    .max(150, { error: 'subjectTooLong' })
    // Le champ est une ligne : un saut de ligne n'y est que de l'injection d'en-têtes d'email.
    .regex(/^[^\r\n]+$/, { error: 'subjectInvalid' }),
  message: z.string().trim().min(10, { error: 'messageTooShort' }).max(2000, { error: 'messageTooLong' }),
  /** Langue du site : celle de l'accusé de réception. */
  locale: z.enum(APPOINTMENT_LOCALES).optional(),
  /** Piège à robots, voir `createAppointmentSchema.website` : volontairement sans règle de validation. */
  website: z.string().max(200).optional(),
  /** Preuve produite par le widget anti-robot (Turnstile). */
  captchaToken: z.string().max(4096).optional(),
});

export type ContactMessageFormValues = z.infer<typeof contactMessageSchema>;
