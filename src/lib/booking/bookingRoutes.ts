// src/lib/booking/bookingRoutes.ts
import { routing } from '@/lib/routing';

/** Chemin (sans locale) de la page de réservation pleine page. */
export const BOOKING_PAGE_PATH = '/rdv';

/**
 * Indique si `pathname` (tel que renvoyé par `usePathname`, locale incluse) est
 * la page de réservation pleine page.
 *
 * Sur cette page, les boutons « Prendre un RDV » qui ouvrent le wizard en
 * fenêtre modale sont masqués : les deux wizards partageraient le même store
 * Zustand et s'écraseraient mutuellement.
 */
export function isBookingPagePath(pathname: string): boolean {
  const segments = pathname.split('/').filter(Boolean);
  const [first, ...rest] = segments;

  const hasLocale = first !== undefined && (routing.locales as readonly string[]).includes(first);
  const path = hasLocale ? rest : segments;

  return path.length === 1 && `/${path[0]}` === BOOKING_PAGE_PATH;
}
