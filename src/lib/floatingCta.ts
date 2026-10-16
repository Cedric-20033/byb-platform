// src/lib/floatingCta.ts

/** Distance de défilement à partir de laquelle le bouton flottant apparaît. */
export const FLOATING_CTA_SCROLL_THRESHOLD = 300;

type PageMetrics = {
  scrollY: number;
  /** Hauteur totale du contenu (`documentElement.scrollHeight`). */
  scrollHeight: number;
  /** Hauteur de la fenêtre (`window.innerHeight`). */
  viewportHeight: number;
};

/**
 * Le bouton « Prendre rendez-vous » surgit au défilement, pour ne pas encombrer le haut de page, mais il doit
 * exister sur TOUTE page publique. Une page trop courte pour défiler au-delà du seuil (404, mentions légales
 * sur grand écran) ne le déclencherait jamais : il est alors affiché d'emblée.
 */
export function shouldShowFloatingCta({ scrollY, scrollHeight, viewportHeight }: PageMetrics): boolean {
  const scrollableDistance = scrollHeight - viewportHeight;
  return scrollableDistance <= FLOATING_CTA_SCROLL_THRESHOLD || scrollY > FLOATING_CTA_SCROLL_THRESHOLD;
}
