// src/lib/maps.ts
import type { CompanySite } from '@/data/company';
import { t } from '@/lib/utils';

/** Adresse sur une ligne, dans la langue demandée (ex. "Rue Vaudrée 66, 4031 Liège, Belgique"). */
export function formatSiteAddress(site: CompanySite, locale: string): string {
  const { street, postalCode, city, country } = site.address;
  return `${street}, ${postalCode} ${city}, ${t(country, locale)}`;
}

/**
 * URL d'intégration Google Maps construite à partir de l'adresse.
 *
 * Contrairement à une URL "pb=" copiée depuis Google Maps (qui embarque des
 * coordonnées et un identifiant de lieu figés — source d'erreurs de copier-coller),
 * la forme `?q=<adresse>&output=embed` se recalcule toujours depuis la donnée
 * source : modifier l'adresse du site suffit à corriger la carte.
 */
export function buildMapEmbedUrl(site: CompanySite, locale: string): string {
  const query = encodeURIComponent(formatSiteAddress(site, locale));
  return `https://www.google.com/maps?q=${query}&hl=${locale}&z=15&output=embed`;
}
