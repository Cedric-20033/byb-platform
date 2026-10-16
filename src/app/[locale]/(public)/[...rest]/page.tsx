// src/app/[locale]/(public)/[...rest]/page.tsx
import { notFound } from 'next/navigation';

/**
 * Attrape toute URL publique inconnue (`/fr/page-inexistante`, `/fr/a/b/c`) pour la renvoyer à la 404 du
 * site public, rendue DANS le chrome (navbar, footer, bouton « Prendre un RDV »).
 *
 * Sans cette route, une URL qui ne correspond à aucune page échappe à tout layout du segment `[locale]` :
 * Next.js affiche alors sa page 404 par défaut, en anglais et sans aucun élément du site.
 * Les routes précises (services, rdv, contact, dashboard...) gardent la priorité sur ce « fourre-tout ».
 */
export default function UnknownPublicPage(): never {
  notFound();
}
