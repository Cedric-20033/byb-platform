// src/components/contact/ConsentMap.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type ConsentMapProps = {
  /** URL d'intégration Google Maps, chargée uniquement sur demande du visiteur. */
  src: string;
  /** Titre accessible de la carte. */
  title: string;
  /** Nom du site représenté, pour distinguer les boutons quand la page affiche plusieurs cartes. */
  siteName: string;
};

/**
 * Carte Google Maps chargée au clic.
 *
 * Intégrer l'iframe d'emblée enverrait l'adresse IP de chaque visiteur à Google, qui peut y déposer des cookies,
 * avant tout choix de sa part. Tant que le visiteur ne clique pas, aucune requête ne part : c'est ce qui permet
 * de se passer d'un bandeau de consentement (voir la politique de confidentialité, section « Cookies »).
 * Le consentement n'est volontairement pas mémorisé : il ne vaut que pour la carte demandée, pour la visite en cours.
 */
export function ConsentMap({ src, title, siteName }: ConsentMapProps) {
  const t = useTranslations('contact.map');
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <iframe
        src={src}
        className="w-full h-full"
        style={{ border: 0 }}
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        title={title}
      />
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center bg-[var(--color-surface-raised)]">
      <MapPin size={28} className="text-[var(--color-primary)]" aria-hidden="true" />
      <p className="text-sm text-[var(--color-muted)] max-w-xs">{t('consent')}</p>
      <Button type="button" variant="outline" size="sm" onClick={() => setLoaded(true)}>
        {t('load', { name: siteName })}
      </Button>
    </div>
  );
}
