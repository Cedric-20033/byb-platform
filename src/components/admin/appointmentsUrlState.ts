// src/components/admin/appointmentsUrlState.ts
import { z } from 'zod';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import {
  APPOINTMENT_SORT_FIELDS,
  type AppointmentSortField,
  type SortDirection,
} from '@/domain/appointment/AppointmentRepository';
import { appointmentSearchFiltersSchema, type AppointmentSearchFiltersValues } from '@/lib/validation/appointment';

/**
 * État de la liste des rendez-vous (filtres, page, tri) porté par l'URL : un lien partagé, un
 * rechargement ou le bouton « retour » retrouvent exactement la même vue.
 */
export type AppointmentsListState = {
  filters: AppointmentSearchFiltersValues;
  page: number;
  sort: AppointmentSortField;
  direction: SortDirection;
};

export const DEFAULT_LIST_STATE: AppointmentsListState = { filters: {}, page: 1, sort: 'slotDate', direction: 'desc' };

/** Nom du paramètre d'URL de chaque filtre : courts, lisibles dans une barre d'adresse. */
const FILTER_PARAMS = { query: 'q', status: 'status', serviceId: 'service', dateFrom: 'from', dateTo: 'to' } as const;
type FilterKey = keyof typeof FILTER_PARAMS;

/**
 * Lit l'état depuis l'URL. L'URL est modifiable à la main : toute valeur invalide est ignorée
 * (retour à la valeur par défaut) plutôt que de casser la page ou de partir au serveur.
 */
export function parseListState(params: URLSearchParams): AppointmentsListState {
  const filters: AppointmentSearchFiltersValues = {};
  for (const key of Object.keys(FILTER_PARAMS) as FilterKey[]) {
    const raw = params.get(FILTER_PARAMS[key]);
    if (!raw) continue;
    const parsed = appointmentSearchFiltersSchema.shape[key].safeParse(raw);
    if (parsed.success && parsed.data) Object.assign(filters, { [key]: parsed.data });
  }

  const page = Number.parseInt(params.get('page') ?? '', 10);
  const sort = params.get('sort');
  const direction = params.get('dir');

  return {
    filters,
    page: Number.isInteger(page) && page >= 1 ? page : DEFAULT_LIST_STATE.page,
    sort: APPOINTMENT_SORT_FIELDS.find((field) => field === sort) ?? DEFAULT_LIST_STATE.sort,
    direction: direction === 'asc' || direction === 'desc' ? direction : DEFAULT_LIST_STATE.direction,
  };
}

/** Écrit l'état dans l'URL en omettant les valeurs par défaut : l'URL d'une vue non filtrée reste propre. */
export function serializeListState(state: AppointmentsListState): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of Object.keys(FILTER_PARAMS) as FilterKey[]) {
    const value = state.filters[key];
    if (value) params.set(FILTER_PARAMS[key], value);
  }
  if (state.page > DEFAULT_LIST_STATE.page) params.set('page', String(state.page));
  if (state.sort !== DEFAULT_LIST_STATE.sort) params.set('sort', state.sort);
  if (state.direction !== DEFAULT_LIST_STATE.direction) params.set('dir', state.direction);

  return params;
}

/**
 * Requête d'un lien profond vers la fiche d'un rendez-vous (cloche de notifications) : la liste est filtrée sur
 * les demandes en attente, les plus récentes d'abord, pour que le rendez-vous visé soit sur la première page.
 */
export function buildOpenAppointmentQuery(appointmentId: string): string {
  const params = serializeListState({
    ...DEFAULT_LIST_STATE,
    filters: { status: AppointmentStatus.PENDING },
    sort: 'createdAt',
    direction: 'desc',
  });
  params.set('open', appointmentId);
  return params.toString();
}

/** Identifiant de la fiche à ouvrir, lu dans l'URL ; une valeur qui n'est pas un UUID est ignorée. */
export function parseOpenAppointmentId(value: string | null | undefined): string | null {
  const parsed = z.uuid().safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * Clic sur un en-tête de colonne : même colonne = on inverse le sens ; autre colonne = on la prend avec
 * son sens naturel (les dates du plus récent au plus ancien, le reste de A à Z). Retour à la page 1.
 */
export function toggleSort(state: AppointmentsListState, field: AppointmentSortField): AppointmentsListState {
  const naturalDirection: SortDirection = field === 'slotDate' || field === 'createdAt' ? 'desc' : 'asc';
  const direction: SortDirection =
    state.sort === field ? (state.direction === 'asc' ? 'desc' : 'asc') : naturalDirection;

  return { ...state, sort: field, direction, page: 1 };
}
