// src/lib/booking/adminNotificationEmail.ts
import { company } from '@/data/company';

/**
 * Adresse de l'entreprise qui reçoit les notifications de réservation (nouvelle demande, annulation ou
 * déplacement par un client). Variable d'environnement prioritaire : elle permet de changer de
 * destinataire sans toucher au code ; à défaut, l'email de contact de l'entreprise.
 */
export function getAdminNotificationEmail(): string {
  return process.env.ADMIN_NOTIFICATION_EMAIL ?? company.contact.email;
}
