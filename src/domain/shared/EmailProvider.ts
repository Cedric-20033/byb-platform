// src/domain/shared/EmailProvider.ts

/**
 * Port de sortie : contrat pour l'envoi d'emails.
 * Resend, SendGrid ou Mailgun l'implémentent depuis l'infrastructure.
 */
export interface EmailProvider {
  send(payload: EmailPayload): Promise<void>;
}

export type EmailPayload = {
  to: string;
  subject: string;
  /** Type d'email — détermine le template React Email à utiliser */
  type: EmailType;
  /** Données dynamiques injectées dans le template */
  data: Record<string, unknown>;
  /** Langue du destinataire — prépare le multilingue des emails (fr par défaut). */
  locale?: 'fr' | 'en' | 'de';
};

export enum EmailType {
  APPOINTMENT_CONFIRMATION = 'appointment_confirmation',
  APPOINTMENT_CONFIRMED_BY_ADMIN = 'appointment_confirmed_by_admin',
  APPOINTMENT_CANCELLATION = 'appointment_cancellation',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  ADMIN_NEW_APPOINTMENT = 'admin_new_appointment',
  ADMIN_INVITATION = 'admin_invitation',
}
