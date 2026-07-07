// src/application/admin/ListAppointments.ts
import type { Appointment } from '@/domain/appointment/Appointment';
import type {
  AppointmentRepository,
  AppointmentSearchFilters,
} from '@/domain/appointment/AppointmentRepository';

/**
 * Use case : recherche et filtrage des rendez-vous pour le dashboard admin.
 * Un objet de filtres vide retourne l'ensemble des rendez-vous.
 */
export class ListAppointments {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async execute(filters: AppointmentSearchFilters = {}): Promise<Appointment[]> {
    return this.appointmentRepository.search(filters);
  }
}
