// src/components/admin/dashboard/formatters.ts
import type { Service } from '@/types';
import { t as translateField } from '@/lib/utils';
import { findService } from '../serviceLookup';

/** Heure issue de la base ("09:00:00") ramenée à "09:00". */
export function shortTime(time: string): string {
  return time.slice(0, 5);
}

/**
 * Nom d'un service dans la langue active, ou `null` s'il n'est pas dans le catalogue transmis
 * (un admin sans `services.view` ne reçoit que les services actifs) : l'appelant affiche alors un libellé
 * de repli traduit plutôt qu'un identifiant technique.
 */
export function serviceName(services: Service[], serviceId: string, locale: string): string | null {
  const service = findService(services, serviceId);
  return service ? translateField(service.name, locale) : null;
}
