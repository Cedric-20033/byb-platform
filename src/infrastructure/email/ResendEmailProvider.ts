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
    private readonly fromAddress: string = process.env.RESEND_FROM_EMAIL ?? 'contact@kenbusinessgroup.com',
  ) {
    this.resend = new Resend(apiKey);
  }

  /**
   * Envoie un email via Resend.
   *
   * N'importe jamais une exception vers l'appelant : dans les trois use cases
   * qui envoient des emails (CreateAppointment, ConfirmAppointment,
   * CancelAppointment), l'écriture critique en base a déjà réussi au moment
   * de cet appel — un échec d'envoi (clé API, domaine non vérifié, quota
   * Resend...) est un incident secondaire, jamais une raison de faire échouer
   * une transaction métier déjà actée. L'erreur est seulement journalisée.
   */
  async send(payload: EmailPayload): Promise<void> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: payload.to,
        subject: payload.subject,
        html: this.renderHtml(payload),
      });
      if (error) {
        console.error(`[ResendEmailProvider] Échec d'envoi (${payload.type}) vers ${payload.to} :`, error);
      }
    } catch (error) {
      // Le SDK peut aussi rejeter directement (réseau, clé API absente...) en
      // plus de retourner un champ `error` — les deux cas sont traités pareil.
      console.error(`[ResendEmailProvider] Exception lors de l'envoi (${payload.type}) vers ${payload.to} :`, error);
    }
  }

  private renderHtml(payload: EmailPayload): string {
    switch (payload.type) {
      case EmailType.APPOINTMENT_CONFIRMATION:
        return `<p>Votre demande de rendez-vous a bien été reçue. Elle est en cours de traitement par notre équipe.</p>`;
      case EmailType.APPOINTMENT_CONFIRMED_BY_ADMIN:
        return `<p>Votre rendez-vous est confirmé. Nous avons hâte de vous accueillir.</p>`;
      case EmailType.APPOINTMENT_CANCELLATION: {
        const reason = payload.data.reason as string | null | undefined;
        return `<p>Votre rendez-vous a été annulé.</p>${
          reason ? `<p><strong>Message :</strong> ${escapeHtml(reason)}</p>` : ''
        }`;
      }
      case EmailType.APPOINTMENT_REMINDER:
        return `<p>Rappel : vous avez un rendez-vous prochainement.</p>`;
      case EmailType.ADMIN_NEW_APPOINTMENT: {
        const appointment = payload.data.appointment as {
          clientName: string;
          clientEmail: string;
          clientPhone: string;
          notes: string | null;
        };
        const slotDate = payload.data.slotDate as string;
        const slotStartTime = payload.data.slotStartTime as string;
        return `
          <p>Un nouveau rendez-vous vient d'être pris sur le site.</p>
          <ul>
            <li><strong>Client :</strong> ${escapeHtml(appointment.clientName)}</li>
            <li><strong>Email :</strong> ${escapeHtml(appointment.clientEmail)}</li>
            <li><strong>Téléphone :</strong> ${escapeHtml(appointment.clientPhone)}</li>
            <li><strong>Créneau :</strong> ${escapeHtml(slotDate)} à ${escapeHtml(slotStartTime)}</li>
            ${appointment.notes ? `<li><strong>Notes :</strong> ${escapeHtml(appointment.notes)}</li>` : ''}
          </ul>
          <p>Rendez-vous sur le dashboard pour le confirmer.</p>
        `;
      }
      default:
        return `<p></p>`;
    }
  }
}

/** Échappement minimal pour insérer en sécurité du texte libre (nom, message...) dans un email HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
