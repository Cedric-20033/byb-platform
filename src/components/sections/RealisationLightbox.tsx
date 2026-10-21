// src/components/sections/RealisationLightbox.tsx
'use client';

import dynamic from 'next/dynamic';
import type { RealisationLightboxProps } from './RealisationLightboxImpl';

/** Chargé à part : la bibliothèque et ses styles ne servent qu'après un clic sur une photo ou une vidéo. */
const LightboxImpl = dynamic(() => import('./RealisationLightboxImpl').then((m) => m.RealisationLightboxImpl), {
  ssr: false,
});

/**
 * Point d'entrée de la lightbox des réalisations (voir `RealisationLightboxImpl` pour les options).
 * Tant qu'aucune slide n'est demandée (`index === null`), rien n'est monté ni téléchargé.
 */
export function RealisationLightbox(props: RealisationLightboxProps) {
  if (props.index === null) return null;
  return <LightboxImpl {...props} />;
}
