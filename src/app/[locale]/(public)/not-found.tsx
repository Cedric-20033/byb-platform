// src/app/[locale]/(public)/not-found.tsx
import { NotFoundContent } from '@/components/layout/NotFoundContent';

/**
 * 404 du site public : rendue dans `(public)/layout.tsx`, donc avec navbar, footer et bouton
 * « Prendre un RDV » comme toute autre page publique.
 */
export default function PublicNotFound() {
  return <NotFoundContent />;
}
