// src/app/[locale]/not-found.tsx
import { NotFoundContent } from '@/components/layout/NotFoundContent';

/**
 * 404 de secours du segment [locale], sans chrome. Le site public a sa propre 404
 * (`(public)/not-found.tsx`), qui s'affiche avec la navbar, le footer et le bouton de réservation.
 */
export default function NotFound() {
  return <NotFoundContent fullScreen />;
}
