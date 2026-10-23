// src/infrastructure/email/ResendEmailProvider.ts
import { Resend } from 'resend';
import { DomainError } from '@/domain/shared/DomainError';
import type { EmailProvider, EmailPayload, ReliableEmailSender } from '@/domain/shared/EmailProvider';
import { EmailType } from '@/domain/shared/EmailProvider';
import type { AppointmentEmailContext, AppointmentEmailContextResolver } from './AppointmentEmailContext';
import { buildAppointmentEmail, isAppointmentEmail, resolveEmailLocale, type BuiltEmail } from './buildAppointmentEmail';
import { buildContactEmail, isContactEmail } from './buildContactEmail';
import { resolveAppBaseUrl } from './clientLinks';
import { INVITATION_COPY } from './invitationEmailCopy';
import { SupabaseAppointmentEmailContext } from './SupabaseAppointmentEmailContext';

/**
 * Implémentation Resend des contrats EmailProvider (au mieux) et ReliableEmailSender (qui signale l'échec).
 *
 * Les use cases ne fournissent ni objet, ni liens, ni détails du créneau : pour un email de rendez-vous,
 * le provider relit en base ce dont le gabarit a besoin (jeton, créneau, nom du service) via le
 * `AppointmentEmailContextResolver`, puis rend le gabarit dans la langue du destinataire.
 * Aucun use case n'est donc touché quand un gabarit évolue.
 */
export class ResendEmailProvider implements EmailProvider, ReliableEmailSender {
  private readonly resend: Resend;

  constructor(
    apiKey: string = process.env.RESEND_API_KEY!,
    private readonly fromAddress: string = process.env.RESEND_FROM_EMAIL ?? 'contact@kenbusinessgroup.com',
    private readonly contextResolver: AppointmentEmailContextResolver = new SupabaseAppointmentEmailContext(),
  ) {
    this.resend = new Resend(apiKey);
  }

  /**
   * Envoi au mieux : n'importe jamais une exception vers l'appelant. Dans les use cases qui envoient des
   * emails, l'écriture critique en base a déjà réussi au moment de cet appel — un échec d'envoi (clé API,
   * domaine non vérifié, quota Resend...) est un incident secondaire, jamais une raison de faire échouer
   * une transaction métier déjà actée. L'erreur est journalisée par `sendOrThrow`.
   */
  async send(payload: EmailPayload): Promise<void> {
    try {
      await this.sendOrThrow(payload);
    } catch {
      // Déjà journalisé : rien d'autre à faire.
    }
  }

  /**
   * Envoi dont l'échec compte : lève `EMAIL_DELIVERY_FAILED` (réseau, clé API absente, refus du fournisseur...).
   * Le SDK peut aussi bien rejeter que retourner un champ `error` : les deux cas sont traités pareil.
   * Le destinataire n'est pas journalisé : c'est une donnée personnelle.
   */
  async sendOrThrow(payload: EmailPayload): Promise<void> {
    try {
      const email = await this.compose(payload);
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to: payload.to,
        replyTo: payload.replyTo,
        subject: email.subject,
        html: email.html,
        attachments: email.attachments.map((file) => ({
          filename: file.filename,
          content: Buffer.from(file.content, 'utf-8'),
          contentType: file.contentType,
        })),
      });
      if (error) throw error;
    } catch (error) {
      console.error(`[ResendEmailProvider] Échec d'envoi (${payload.type}) :`, error);
      throw new DomainError("L'email n'a pas pu être envoyé.", 'EMAIL_DELIVERY_FAILED');
    }
  }

  private async compose(payload: EmailPayload): Promise<BuiltEmail> {
    if (isAppointmentEmail(payload.type)) {
      const context = await this.loadContext(payload);
      const built = await buildAppointmentEmail(payload, context, { baseUrl: resolveAppBaseUrl() });
      if (built) return built;
    }

    if (isContactEmail(payload.type)) {
      const built = await buildContactEmail(payload);
      if (built) return built;
    }

    return { subject: payload.subject ?? '', html: this.renderInvitation(payload), attachments: [] };
  }

  /** Une lecture en échec n'empêche pas l'envoi : l'email part sans détails ni liens. */
  private async loadContext(payload: EmailPayload): Promise<AppointmentEmailContext | null> {
    const appointmentId = (payload.data.appointment as { id?: string } | undefined)?.id;
    if (!appointmentId) return null;

    try {
      return await this.contextResolver.resolve(appointmentId, resolveEmailLocale(payload));
    } catch (error) {
      console.error(`[ResendEmailProvider] Contexte du rendez-vous illisible (${payload.type}) :`, error);
      return null;
    }
  }

  private renderInvitation(payload: EmailPayload): string {
    if (payload.type !== EmailType.ADMIN_INVITATION) return '<p></p>';

    const copy = INVITATION_COPY[payload.locale ?? 'fr'];
    const url = payload.data.url as string;
    return `
      <p>${copy.greeting(escapeHtml(String(payload.data.fullName ?? '')))}</p>
      <p>${copy.body}</p>
      <p><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px">${copy.cta}</a></p>
      <p style="color:#666;font-size:12px">${copy.expiry}</p>
    `;
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
