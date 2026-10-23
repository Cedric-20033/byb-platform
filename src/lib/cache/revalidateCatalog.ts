// src/lib/cache/revalidateCatalog.ts
import { revalidatePath } from 'next/cache';

/**
 * Pages publiques qui affichent le catalogue. À appeler après CHAQUE mutation du catalogue
 * (service, sous-prestation, média) pour que le site reflète le changement sans redéploiement.
 *
 * Un motif dynamique (`[locale]`, `[slug]`) exige le second argument `'page'` : sans lui,
 * Next.js attend un chemin concret et n'invalide rien.
 */
const CATALOG_PAGES = [
  '/[locale]',
  '/[locale]/services',
  '/[locale]/services/[slug]',
  '/[locale]/realisations',
] as const;

export function revalidateCatalog(): void {
  for (const path of CATALOG_PAGES) revalidatePath(path, 'page');
}
