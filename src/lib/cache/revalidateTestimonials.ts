// src/lib/cache/revalidateTestimonials.ts
import { revalidatePath } from 'next/cache';

/**
 * Pages publiques qui affichent des témoignages (l'accueil). À appeler après CHAQUE mutation d'un
 * témoignage. Un motif dynamique (`[locale]`) exige le second argument `'page'` : sans lui, Next.js
 * attend un chemin concret et n'invalide rien.
 */
const TESTIMONIAL_PAGES = ['/[locale]'] as const;

export function revalidateTestimonials(): void {
  for (const path of TESTIMONIAL_PAGES) revalidatePath(path, 'page');
}
