// src/lib/validation/password.ts
import { z } from 'zod';
import { LOCALES } from '@/lib/constants';

export const PASSWORD_MIN_LENGTH = 10;

/** bcrypt (utilisé par Supabase Auth) ignore silencieusement tout au-delà de 72 octets. */
export const PASSWORD_MAX_LENGTH = 72;

/**
 * Règle de mot de passe commune à l'activation d'un compte, à la réinitialisation
 * et au changement : longueur minimale + au moins une lettre et un chiffre.
 * La longueur compte plus que la complexité (recommandation NIST SP 800-63B),
 * d'où l'absence d'exigence de caractères spéciaux.
 */
const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: 'passwordTooShort' })
  .max(PASSWORD_MAX_LENGTH, { error: 'passwordTooLong' })
  .refine((value) => /\p{L}/u.test(value) && /\d/.test(value), { error: 'passwordWeak' });

/** Définition d'un mot de passe après un lien reçu par email (invitation, réinitialisation). */
export const setPasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: 'passwordMismatch',
    path: ['confirmPassword'],
  });

export type SetPasswordValues = z.infer<typeof setPasswordSchema>;

/** Changement de mot de passe par un admin connecté (le mot de passe actuel est revérifié). */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: 'invalid' }),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: 'passwordMismatch',
    path: ['confirmPassword'],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

/** Demande de lien de réinitialisation ; la locale choisit la langue de la page d'arrivée. */
export const requestPasswordResetSchema = z.object({
  email: z.email({ error: 'emailInvalid' }),
  locale: z.enum(LOCALES),
});

export type RequestPasswordResetValues = z.infer<typeof requestPasswordResetSchema>;
