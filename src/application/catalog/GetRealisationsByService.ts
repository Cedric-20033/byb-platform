// src/application/catalog/GetRealisationsByService.ts
import type { Service, ServiceVideo, I18nField } from '@/types';

export type RealisationServiceGroup = {
  serviceId: string;
  serviceSlug: string;
  serviceName: I18nField;
  images: string[];
  videos: ServiceVideo[];
};

/**
 * Regroupe, service par service, les médias déjà présents dans
 * `service_media` (photos + vidéos) pour la page /realisations. Un service
 * sans aucun média (ni photo ni vidéo) est exclu du résultat.
 *
 * Couche application, pure : aucune dépendance à Supabase ou Cloudinary ici,
 * uniquement une recomposition des `Service` déjà chargés par la page —
 * l'infrastructure (SupabaseServiceRepository) peut changer sans que cette
 * fonction bouge.
 */
export function getRealisationsByService(services: Service[]): RealisationServiceGroup[] {
  return services
    .map((service) => ({
      serviceId: service.id,
      serviceSlug: service.slug,
      serviceName: service.name,
      // coverImage n'est jamais dupliqué dans galleryImages (cf. SupabaseServiceRepository.hydrate) —
      // on le réintègre ici pour présenter TOUTES les photos réelles du service, sans en perdre une.
      images: service.coverImage ? [service.coverImage, ...service.galleryImages] : service.galleryImages,
      videos: service.videos,
    }))
    .filter((group) => group.images.length > 0 || group.videos.length > 0);
}
