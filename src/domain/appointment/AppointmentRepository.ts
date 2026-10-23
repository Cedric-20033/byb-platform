// src/domain/appointment/AppointmentRepository.ts
import type { Appointment } from './Appointment';
import type { AppointmentWithSlot } from './AppointmentWithSlot';

/**
 * Port de sortie : contrat que toute implémentation de persistance doit respecter.
 *
 * Le domaine et l'application ne connaissent que cette interface.
 * Supabase, une API REST, ou une base SQLite l'implémentent depuis l'infrastructure.
 *
 * Principe D de SOLID : on dépend de l'abstraction, pas du détail.
 */
export interface AppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  findAll(): Promise<Appointment[]>;
  /** Recherche filtrée — déléguée à l'implémentation (SQL WHERE côté Supabase). */
  search(filters: AppointmentSearchFilters): Promise<Appointment[]>;
  /**
   * Identique à `search`, mais enrichit chaque résultat avec la date/heure
   * du créneau lié — nécessaire pour le tableau et l'export du dashboard admin,
   * qui doivent afficher "quand" a lieu le rendez-vous, pas seulement son statut.
   * Sans pagination : réservé à l'export et au calendrier, qui veulent tout le périmètre filtré.
   */
  searchWithSlot(filters: AppointmentSearchFilters): Promise<AppointmentWithSlot[]>;
  /** Une page de résultats triés, avec le total des lignes correspondant aux filtres (tableau paginé). */
  searchPage(filters: AppointmentSearchFilters, request: AppointmentPageRequest): Promise<AppointmentPage>;
  /**
   * Rendez-vous actifs (non annulés) d'une adresse email dont le créneau est à `fromDate` ou après
   * (format ISO « AAAA-MM-JJ »). `email` est déjà normalisé en minuscules par l'appelant.
   */
  countUpcomingByEmail(email: string, fromDate: string): Promise<number>;
  save(appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment>;
  updateStatus(id: string, status: Appointment['status']): Promise<void>;
  /** Modifie les coordonnées et les notes ; le service, le créneau et le statut ont leurs propres opérations. */
  updateDetails(id: string, details: AppointmentContactDetails): Promise<void>;
  delete(id: string): Promise<void>;
}

/**
 * Filtres de recherche pour le dashboard admin.
 * Tous les champs sont optionnels et combinables (ET logique).
 */
export type AppointmentSearchFilters = {
  status?: Appointment['status'];
  serviceId?: string;
  clientEmail?: string;
  /** Texte libre recherché dans le nom, l'email et le téléphone du client (sans tenir compte de la casse). */
  query?: string;
  /** Filtre sur la date du créneau lié (pas createdAt) — format ISO "YYYY-MM-DD" */
  dateFrom?: string;
  dateTo?: string;
};

export const APPOINTMENT_SORT_FIELDS = ['slotDate', 'clientName', 'status', 'createdAt'] as const;
export type AppointmentSortField = (typeof APPOINTMENT_SORT_FIELDS)[number];
export type SortDirection = 'asc' | 'desc';

export type AppointmentPageRequest = {
  /** Numéro de page, à partir de 1. */
  page: number;
  pageSize: number;
  sortField: AppointmentSortField;
  direction: SortDirection;
};

export type AppointmentPage = {
  items: AppointmentWithSlot[];
  /** Nombre total de rendez-vous correspondant aux filtres, toutes pages confondues. */
  total: number;
};

export type AppointmentContactDetails = {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string | null;
};
