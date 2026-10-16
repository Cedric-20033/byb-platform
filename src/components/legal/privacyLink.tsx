// src/components/legal/privacyLink.tsx
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PUBLIC_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';

/**
 * Rendu du lien « politique de confidentialité » pour les textes traduits qui le contiennent
 * (`t.rich('clé', { link: renderPrivacyLink(locale) })`, la clé portant `<link>…</link>`).
 * La phrase reste ainsi entièrement traduisible, le lien se plaçant où la langue l'exige.
 *
 * `newTab` : dans un dialogue de réservation en cours, ouvrir la politique dans un nouvel onglet évite
 * de faire perdre au visiteur ce qu'il a déjà saisi.
 */
export function renderPrivacyLink(locale: Locale, options: { newTab?: boolean } = {}) {
  const PrivacyLink = (chunks: ReactNode) => (
    <Link
      href={getLocalizedPath(PUBLIC_ROUTES.PRIVACY, locale)}
      className="underline underline-offset-2 hover:text-[var(--color-primary)]"
      {...(options.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {chunks}
    </Link>
  );
  return PrivacyLink;
}
