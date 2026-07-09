// src/infrastructure/email/ResendEmailProvider.ts
import { Resend } from 'resend';
import type { EmailProvider, EmailPayload } from '@/domain/shared/EmailProvider';
import { EmailType } from '@/domain/shared/EmailProvider';

/**
 * Implémentation Resend du contrat EmailProvider.
 *
 * Contenu HTML minimal pour l'instant — à remplacer par de vrais templates
 * @react-email/components (déjà en dépendance) une fois le design validé.
 * Le use case appelant (CreateAppointment, CancelAppointment) ne sera pas
 * affecté par ce changement futur : il ne connaît que l'interface EmailProvider.
 */
export class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend;

  constructor(
    apiKey: string = process.env.RESEND_API_KEY!,
    private readonly fromAddress: string = process.env.RESEND_FROM_EMAIL ?? 'contact@byb-construction.be',
  ) {
    this.resend = new Resend(apiKey);
  }

  async send(payload: EmailPayload): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.fromAddress,
      to: payload.to,
      subject: payload.subject,
      html: this.renderHtml(payload),
    });

    if (error) {
      throw new Error(`Échec d'envoi d'email (${payload.type}) : ${error.message}`);
    }
  }

  private renderHtml(payload: EmailPayload): string {
    switch (payload.type) {
      case EmailType.APPOINTMENT_CONFIRMATION:
        return `<p>Votre rendez-vous est confirmé. Merci de votre confiance.</p>`;
      case EmailType.APPOINTMENT_CANCELLATION:
        return `<p>Votre rendez-vous a bien été annulé.</p>`;
      case EmailType.APPOINTMENT_REMINDER:
        return `<p>Rappel : vous avez un rendez-vous prochainement.</p>`;
      case EmailType.ADMIN_NEW_APPOINTMENT:
        return `<p>Un nouveau rendez-vous vient d'être pris sur le site.</p>`;
      default:
        return `<p></p>`;
    }
  }
}
