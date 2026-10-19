// src/lib/cache/revalidateSettings.ts
import { revalidatePath } from 'next/cache';

/**
 * Les coordonnées, sites, horaires et réseaux sociaux apparaissent dans le pied de page et plusieurs
 * pages : on invalide donc tout l'arbre localisé. `'layout'` couvre la page demandée ET ses descendantes ;
 * le motif dynamique `[locale]` exige ce second argument, sans lui Next.js n'invalide rien.
 */
export function revalidateSettings(): void {
  revalidatePath('/[locale]', 'layout');
}
