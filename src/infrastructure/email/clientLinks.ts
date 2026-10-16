// src/infrastructure/email/clientLinks.ts
import type { AppointmentLocale } from '@/domain/appointment/AppointmentLocale';

/** URL publique du site, sans barre finale. `NEXT_PUBLIC_APP_URL` est déjà requise pour les invitations admin. */
export function resolveAppBaseUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

export type ClientLinks = {
  cancelUrl: string;
  rescheduleUrl: string;
};

/** Page de réservation : pas de jeton, c'est le lien proposé après une annulation. */
export function buildBookUrl(baseUrl: string, locale: AppointmentLocale): string {
  return `${baseUrl}/${locale}/rdv`;
}

/**
 * Liens d'un email client. Le jeton est le seul secret protégeant le rendez-vous : il ne figure que dans
 * ces URL, jamais dans un journal ni dans les données d'audit.
 */
export function buildClientLinks(baseUrl: string, locale: AppointmentLocale, token: string): ClientLinks {
  const encoded = encodeURIComponent(token);
  return {
    cancelUrl: `${baseUrl}/${locale}/rdv/annuler/${encoded}`,
    rescheduleUrl: `${baseUrl}/${locale}/rdv/modifier/${encoded}`,
  };
}
