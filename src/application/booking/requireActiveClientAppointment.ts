// src/application/booking/requireActiveClientAppointment.ts
import type { ClientAppointmentView } from '@/domain/appointment/ClientAppointmentAccess';
import { DomainError } from '@/domain/shared/DomainError';
import type { GetClientAppointment } from './GetClientAppointment';

/**
 * Garde commune à l'annulation et au déplacement par le client : le jeton doit désigner un rendez-vous
 * encore modifiable. Les deux cas d'échec ont un code distinct pour que la page affiche le bon message.
 */
export async function requireActiveClientAppointment(
  getClientAppointment: GetClientAppointment,
  token: string,
): Promise<ClientAppointmentView> {
  const { view, state } = await getClientAppointment.execute({ token });

  if (state === 'cancelled') {
    throw new DomainError('Ce rendez-vous est déjà annulé.', 'INVALID_STATUS_TRANSITION');
  }
  if (state === 'past') {
    throw new DomainError('Ce rendez-vous est déjà passé.', 'APPOINTMENT_IN_PAST');
  }
  return view;
}
