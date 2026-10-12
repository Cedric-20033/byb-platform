// src/application/admin/ListAppointments.ts
import type {
  AppointmentRepository,
  AppointmentSearchFilters,
  AppointmentSortField,
  SortDirection,
} from '@/domain/appointment/AppointmentRepository';
import type { AppointmentWithSlot } from '@/domain/appointment/AppointmentWithSlot';

/** Taille de page du tableau : fixée côté serveur, jamais choisie par le client. */
export const APPOINTMENTS_PAGE_SIZE = 20;

export type ListAppointmentsInput = {
  filters?: AppointmentSearchFilters;
  /** À partir de 1 ; par défaut, la première page. */
  page?: number;
  sortField?: AppointmentSortField;
  direction?: SortDirection;
  pageSize?: number;
};

export type ListAppointmentsResult = {
  items: AppointmentWithSlot[];
  total: number;
  /** Page réellement servie : peut différer de la page demandée si celle-ci n'existe plus. */
  page: number;
  pageSize: number;
};

/**
 * Use case : recherche, tri et pagination des rendez-vous pour le dashboard admin.
 * Un objet de filtres vide retourne l'ensemble des rendez-vous, du plus récent au plus ancien.
 */
export class ListAppointments {
  constructor(private readonly appointmentRepository: AppointmentRepository) {}

  async execute(input: ListAppointmentsInput = {}): Promise<ListAppointmentsResult> {
    const filters = input.filters ?? {};
    const pageSize = input.pageSize ?? APPOINTMENTS_PAGE_SIZE;
    const request = {
      page: Math.max(1, input.page ?? 1),
      pageSize,
      sortField: input.sortField ?? 'slotDate',
      direction: input.direction ?? 'desc',
    } as const;

    let page = request.page;
    let result = await this.appointmentRepository.searchPage(filters, request);

    // La page demandée n'existe plus (suppressions, filtres changés dans un autre onglet) : on sert
    // la dernière page existante plutôt qu'un tableau vide, alors que des résultats existent.
    const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
    if (page > lastPage) {
      page = lastPage;
      result = await this.appointmentRepository.searchPage(filters, { ...request, page });
    }

    return { ...result, page, pageSize };
  }
}
