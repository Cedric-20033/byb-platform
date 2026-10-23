// src/components/admin/appointmentQueryKeys.ts
import type { QueryClient } from '@tanstack/react-query';

/** Vues qui affichent des rendez-vous : toutes sont rafraîchies quand un rendez-vous change. */
export const APPOINTMENT_QUERY_KEYS = [
  ['admin', 'notifications'],
  ['admin', 'appointments'],
  ['admin', 'calendar'],
  ['admin', 'dashboard'],
] as const;

/** Point de passage unique : ajouter une vue à la liste ci-dessus suffit à la rafraîchir partout. */
export function invalidateAppointmentQueries(queryClient: QueryClient): void {
  for (const queryKey of APPOINTMENT_QUERY_KEYS) queryClient.invalidateQueries({ queryKey });
}
