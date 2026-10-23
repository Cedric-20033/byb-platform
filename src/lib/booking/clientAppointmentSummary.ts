// src/lib/booking/clientAppointmentSummary.ts
import type { Appointment } from '@/domain/appointment/Appointment';
import type { ClientAppointmentView } from '@/domain/appointment/ClientAppointmentAccess';
import type { Locale } from '@/lib/routing';
import { t } from '@/lib/utils';
import type { Service } from '@/types';

/**
 * Ce que les pages « annuler » et « modifier » affichent d'un rendez-vous : un objet plat, déjà
 * traduit, sans coordonnées du client (la page ne montre que ce qui sert à reconnaître le rendez-vous)
 * et sans jeton.
 */
export type ClientAppointmentSummary = {
  serviceId: string;
  serviceName: string;
  subServiceName: string | null;
  /** Créneau actuel, exclu de la grille quand le client en choisit un autre. */
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: Appointment['status'];
};

/**
 * Un service archivé reste lisible (`services` contient aussi les inactifs) ; s'il avait été supprimé,
 * son nom est vide et l'interface n'affiche pas la ligne plutôt qu'un libellé inventé.
 */
export function toClientAppointmentSummary(
  view: ClientAppointmentView,
  services: readonly Service[],
  locale: Locale,
): ClientAppointmentSummary {
  const { appointment, slot } = view;
  const service = services.find((candidate) => candidate.id === appointment.serviceId);
  const subService = appointment.subServiceId
    ? service?.subServices.find((candidate) => candidate.id === appointment.subServiceId)
    : undefined;

  return {
    serviceId: appointment.serviceId,
    serviceName: service ? t(service.name, locale) : '',
    subServiceName: subService ? t(subService.name, locale) : null,
    slotId: slot.id,
    date: slot.date,
    startTime: slot.startTime.slice(0, 5),
    endTime: slot.endTime.slice(0, 5),
    status: appointment.status,
  };
}
