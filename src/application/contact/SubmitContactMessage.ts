// src/application/contact/SubmitContactMessage.ts
import type { AppointmentLocale } from '@/domain/appointment/AppointmentLocale';
import type { ContactMessage } from '@/domain/contact/ContactMessage';
import { EmailType, type EmailProvider, type ReliableEmailSender } from '@/domain/shared/EmailProvider';

export type SubmitContactMessageInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  /** Langue du site au moment de l'envoi : celle de l'accusé de réception. Absente : français. */
  locale?: AppointmentLocale;
};

/** Replie toute suite d'espaces, retours à la ligne compris, en une espace. */
const toSingleLine = (value: string) => value.replace(/\s+/g, ' ').trim();

/**
 * Use case : un visiteur écrit à l'entreprise depuis le formulaire de contact.
 *
 * Le message n'est stocké nulle part : l'email transmis à l'équipe en est l'unique trace. Il part donc par
 * `ReliableEmailSender`, qui signale l'échec. Sans cela, une clé d'API expirée ferait croire au visiteur que
 * son message est parti alors qu'il serait perdu, sans aucune alerte.
 *
 * L'accusé de réception, lui, est un confort : son échec ne remet pas en cause un message déjà transmis.
 * Aucune trace d'audit : rien n'est écrit en base, et le journal est immuable (on n'y verse pas de données personnelles).
 */
export class SubmitContactMessage {
  constructor(
    private readonly reliableSender: ReliableEmailSender,
    private readonly emailProvider: EmailProvider,
    /** Boîte de l'équipe qui reçoit les messages. */
    private readonly teamEmail: string,
  ) {}

  async execute(input: SubmitContactMessageInput): Promise<void> {
    const message: ContactMessage = {
      firstName: toSingleLine(input.firstName),
      lastName: toSingleLine(input.lastName),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      // L'objet d'un email ne doit jamais contenir de saut de ligne (injection d'en-têtes).
      subject: toSingleLine(input.subject),
      message: input.message.trim(),
    };

    // `replyTo` : l'équipe répond d'un clic au visiteur, l'expéditeur technique restant le domaine vérifié.
    await this.reliableSender.sendOrThrow({
      to: this.teamEmail,
      type: EmailType.ADMIN_CONTACT_MESSAGE,
      data: { message },
      locale: 'fr',
      replyTo: message.email,
    });

    await this.emailProvider.send({
      to: message.email,
      type: EmailType.CONTACT_ACKNOWLEDGEMENT,
      data: { message },
      locale: input.locale ?? 'fr',
    });
  }
}
