// src/domain/shared/EmailProvider.ts

/**
 * Port de sortie : contrat pour l'envoi d'emails.
 * Resend, SendGrid ou Mailgun l'implémentent depuis l'infrastructure.
 */
export interface EmailProvider {
  /**
   * Envoi au mieux : n'échoue jamais vers l'appelant. Convient aux emails qui suivent une écriture déjà
   * actée en base (confirmation, annulation...) : un incident d'envoi n'annule pas la transaction métier.
   */
  send(payload: EmailPayload): Promise<void>;
}

/**
 * Port de sortie séparé (ISP) pour l'email qui EST l'opération : un message de contact n'est stocké nulle part,
 * l'email qui le transmet à l'équipe est sa seule trace. S'il part mal, l'appelant doit le savoir pour prévenir
 * le visiteur plutôt que de lui annoncer un succès mensonger.
 */
export interface ReliableEmailSender {
  /** Lève `EMAIL_DELIVERY_FAILED` si le fournisseur refuse ou est injoignable. */
  sendOrThrow(payload: EmailPayload): Promise<void>;
}

export type EmailPayload = {
  to: string;
  /**
   * Objet imposé par l'appelant. Absent : le provider utilise l'objet localisé du gabarit
   * (`emails.<type>.subject`), ce qui évite des phrases en dur dans les use cases.
   */
  subject?: string;
  /** Type d'email — détermine le template React Email à utiliser */
  type: EmailType;
  /** Données dynamiques injectées dans le template */
  data: Record<string, unknown>;
  /** Langue du destinataire — prépare le multilingue des emails (fr par défaut). */
  locale?: 'fr' | 'en' | 'de';
  /** Adresse à laquelle répond le destinataire (ex. le visiteur qui a écrit via le formulaire de contact). */
  replyTo?: string;
};

export enum EmailType {
  APPOINTMENT_CONFIRMATION = 'appointment_confirmation',
  APPOINTMENT_CONFIRMED_BY_ADMIN = 'appointment_confirmed_by_admin',
  APPOINTMENT_CANCELLATION = 'appointment_cancellation',
  APPOINTMENT_RESCHEDULED = 'appointment_rescheduled',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  ADMIN_NEW_APPOINTMENT = 'admin_new_appointment',
  ADMIN_APPOINTMENT_CANCELLED_BY_CLIENT = 'admin_appointment_cancelled_by_client',
  ADMIN_APPOINTMENT_RESCHEDULED_BY_CLIENT = 'admin_appointment_rescheduled_by_client',
  ADMIN_INVITATION = 'admin_invitation',
  ADMIN_CONTACT_MESSAGE = 'admin_contact_message',
  CONTACT_ACKNOWLEDGEMENT = 'contact_acknowledgement',
}
