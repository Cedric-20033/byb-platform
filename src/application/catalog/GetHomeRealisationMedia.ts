// src/application/catalog/GetHomeRealisationMedia.ts
import { seededShuffle } from '@/lib/seededRandom';
import type { Service, I18nField } from '@/types';

/** Nombre de photos piochées par métier avant mélange global. */
const DEFAULT_PER_SERVICE = 3;

export type HomeRealisationItem = {
  publicId: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: I18nField;
};

/**
 * Sélectionne quelques photos par service pour la section "Réalisations" de
 * la page d'accueil.
 *
 * Le tirage est "aléatoire" au sens visuel (on ne prend plus systématiquement
 * les mêmes photos de chaque service) mais reste déterministe : il est
 * dérivé de l'id du service (seed stable), donc identique à chaque rendu tant
 * que le catalogue ne change pas — pas de scintillement au refresh de page.
 *
 * Couche application (pure, sans dépendance infrastructure) : reçoit les
 * services déjà chargés par la page (Server Component) et se contente de
 * les recomposer pour l'affichage.
 */
export function getHomeRealisationMedia(
  services: Service[],
  perService: number = DEFAULT_PER_SERVICE,
): HomeRealisationItem[] {
  const items: HomeRealisationItem[] = [];

  for (const service of services) {
    // coverImage n'est jamais dupliqué dans galleryImages (cf. SupabaseServiceRepository.hydrate) —
    // on doit donc le réintégrer ici pour piocher parmi TOUTES les photos réelles du service.
    const pool = service.coverImage ? [service.coverImage, ...service.galleryImages] : service.galleryImages;
    if (pool.length === 0) continue;

    const picked = seededShuffle(pool, `home-realisation:${service.id}`).slice(0, perService);
    for (const publicId of picked) {
      items.push({ publicId, serviceId: service.id, serviceSlug: service.slug, serviceName: service.name });
    }
  }

  // Mélange l'ordre d'affichage final pour ne pas regrouper visuellement les
  // photos par métier — seed fixe : ordre stable, jamais aléatoire au refresh.
  return seededShuffle(items, 'home-realisation:order');
}
