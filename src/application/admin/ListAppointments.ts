// src/application/admin/ListAppointments.ts
import type {
  AppointmentRepository,
  AppointmentSearchFilters,
} from '@/domain/appointment/AppointmentRepository';
import type { AppointmentWithSlot } from '@/domain/appointment/AppointmentWithSlot';

/**
 * Use case : recherche et filtrage des rendez-vous pour le dashboard admin.
 * Un objet de filtres vide retourne l'ensemble des rendez-vous.
 * Retourne les RDV enrichis de la date/heure de leur créneau (nécessaire à
 * l'affichage du tableau et au tri chronologique).
 */
export class ListAppointments {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async execute(filters: AppointmentSearchFilters = {}): Promise<AppointmentWithSlot[]> {
    return this.appointmentRepository.searchWithSlot(filters);
  }
}
