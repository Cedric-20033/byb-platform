// src/lib/booking/resolveBookingPreselection.ts
import type { Service, SubService } from '@/types';

/** Valeur brute d'un paramètre d'URL telle que Next.js la fournit à `searchParams`. */
type QueryValue = string | string[] | undefined;

export type BookingPreselection = {
  service: Service | null;
  subService: SubService | null;
};

/** `?a=1&a=2` produit un tableau : on retient la première valeur, non vide. */
function firstValue(value: QueryValue): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Traduit les paramètres `?service=<slug>&sub=<slug>` de la page /rdv en
 * objets du catalogue.
 *
 * L'URL est une entrée non fiable (lien partagé, ancien favori, service
 * archivé depuis) : un slug inconnu n'est jamais une erreur, il ramène
 * simplement le visiteur au début de l'assistant.
 */
export function resolveBookingPreselection(
  services: Service[],
  serviceSlug: QueryValue,
  subServiceSlug: QueryValue,
): BookingPreselection {
  const wantedService = firstValue(serviceSlug);
  const service = wantedService ? (services.find((s) => s.slug === wantedService) ?? null) : null;

  // Le slug d'une sous-prestation n'est unique qu'au sein de son service :
  // sans service valide, il serait ambigu et est donc ignoré.
  if (!service) return { service: null, subService: null };

  const wantedSubService = firstValue(subServiceSlug);
  const subService = wantedSubService
    ? (service.subServices.find((s) => s.slug === wantedSubService) ?? null)
    : null;

  return { service, subService };
}
