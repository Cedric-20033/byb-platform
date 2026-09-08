// src/components/sections/RealisationLightbox.tsx
'use client';

import Lightbox, { type Slide } from 'yet-another-react-lightbox';
import Video from 'yet-another-react-lightbox/plugins/video';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Slideshow from 'yet-another-react-lightbox/plugins/slideshow';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/counter.css';

type RealisationLightboxProps = {
  /** Index de la slide à ouvrir, ou `null` pour une lightbox fermée. */
  index: number | null;
  slides: Slide[];
  onClose: () => void;
  /** Active le plugin vidéo — inutile sur une galerie 100% photo. */
  hasVideo?: boolean;
};

/**
 * Lightbox plein écran partagée par toutes les galeries de réalisations
 * (accueil, page /realisations, modale "voir plus") : mode diaporama
 * (Slideshow), plein écran natif, miniatures de navigation, compteur et
 * zoom photo — capacités déjà offertes par yet-another-react-lightbox,
 * centralisées ici pour ne pas dupliquer la configuration des plugins.
 *
 * IMPORTANT (vidéos, mobile) : le plein écran NATIF du <video> (l'icône
 * d'agrandissement propre au lecteur, ou le double-tap sur Android) est
 * désactivé volontairement — iOS et Android y utilisent un moteur de rendu
 * différent de la lecture inline et interprètent alors différemment les
 * métadonnées de rotation de la vidéo, ce qui affiche l'image pivotée à 90°.
 * Le bouton plein écran du plugin Fullscreen ci-dessous (CSS, même moteur de
 * rendu que l'inline) reste la seule voie vers le plein écran, et n'a pas ce
 * problème.
 */
export function RealisationLightbox({ index, slides, onClose, hasVideo = false }: RealisationLightboxProps) {
  return (
    <Lightbox
      open={index !== null}
      close={onClose}
      index={index ?? 0}
      slides={slides}
      plugins={
        hasVideo
          ? [Video, Fullscreen, Slideshow, Thumbnails, Counter]
          : [Fullscreen, Slideshow, Thumbnails, Counter, Zoom]
      }
      slideshow={{ delay: 3500 }}
      video={
        hasVideo
          ? {
              playsInline: true,
              disablePictureInPicture: true,
              // "nofullscreen" est respecté par Chrome/Android ; le CSS dans
              // globals.css complète pour Safari/iOS, qui l'ignore.
              controlsList: 'nofullscreen',
            }
          : undefined
      }
    />
  );
}
