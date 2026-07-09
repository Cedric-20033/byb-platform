// src/app/[locale]/(public)/layout.tsx
import { PublicChrome } from '@/components/layout/PublicChrome';

/**
 * Layout du groupe de routes publiques.
 * Les parenthèses dans le nom du dossier (public) créent un groupe logique
 * sans modifier les URLs — le dashboard admin (groupe frère (admin)) n'hérite
 * jamais de ce chrome.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicChrome>{children}</PublicChrome>;
}
