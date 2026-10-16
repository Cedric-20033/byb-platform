// src/application/booking/GetClientAppointment.ts
import {
  clientAppointmentState,
  type ClientAppointmentAccess,
  type ClientAppointmentState,
  type ClientAppointmentView,
} from '@/domain/appointment/ClientAppointmentAccess';
import { systemClock, type Clock } from '@/domain/shared/Clock';
import { DomainError } from '@/domain/shared/DomainError';

export type ClientAppointmentOverview = {
  view: ClientAppointmentView;
  state: ClientAppointmentState;
};

/**
 * Use case : un client consulte son rendez-vous grâce au jeton de son email.
 *
 * Lecture seule : aucune trace d'audit (consulter n'est pas agir). Un jeton inconnu lève
 * `APPOINTMENT_NOT_FOUND`, sans distinguer « jamais existé » de « supprimé ».
 */
export class GetClientAppointment {
  constructor(
    private readonly access: ClientAppointmentAccess,
    private readonly clock: Clock = systemClock,
  ) {}

  async execute(input: { token: string }): Promise<ClientAppointmentOverview> {
    const view = await this.access.findByToken(input.token);
    if (!view) throw new DomainError('Rendez-vous introuvable ou lien invalide.', 'APPOINTMENT_NOT_FOUND');

    return { view, state: clientAppointmentState(view.appointment.status, view.slot, this.clock.now()) };
  }
}
