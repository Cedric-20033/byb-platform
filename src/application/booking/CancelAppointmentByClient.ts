// src/application/booking/CancelAppointmentByClient.ts
import { ActorRole } from '@/domain/shared/AuditLogger';
import { EmailType, type EmailProvider } from '@/domain/shared/EmailProvider';
import type { CancelAppointment } from './CancelAppointment';
import type { GetClientAppointment } from './GetClientAppointment';
import { requireActiveClientAppointment } from './requireActiveClientAppointment';

/**
 * Use case : un client annule son rendez-vous depuis le lien de son email.
 *
 * Il ne réimplémente rien : l'annulation elle-même (transition de statut, libération du créneau,
 * email au client, trace d'audit avec l'acteur « client ») est celle de `CancelAppointment`, la même
 * que pour un admin. Il ajoute seulement ce qui est propre au client : le jeton comme preuve
 * d'identité, le refus d'un rendez-vous passé, et la notification de l'équipe.
 */
export class CancelAppointmentByClient {
  constructor(
    private readonly getClientAppointment: GetClientAppointment,
    private readonly cancelAppointment: CancelAppointment,
    private readonly emailProvider: EmailProvider,
    /** Adresse de l'entreprise à prévenir : un créneau libéré est une information à traiter. */
    private readonly adminNotificationEmail: string,
  ) {}

  async execute(input: { token: string }): Promise<void> {
    const view = await requireActiveClientAppointment(this.getClientAppointment, input.token);

    await this.cancelAppointment.execute({
      appointmentId: view.appointment.id,
      actorId: null,
      actorRole: ActorRole.CLIENT,
    });

    // L'annulation est actée : un échec d'envoi (absorbé par le provider) ne doit pas la remettre en cause.
    await this.emailProvider.send({
      to: this.adminNotificationEmail,
      type: EmailType.ADMIN_APPOINTMENT_CANCELLED_BY_CLIENT,
      data: { appointment: view.appointment },
      locale: 'fr',
    });
  }
}
