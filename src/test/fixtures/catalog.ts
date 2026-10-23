// src/test/fixtures/catalog.ts
import type { Service, SubService } from '@/types';

/** Sous-prestation minimale : le slug sert aussi de nom français et d'identifiant. */
export function buildSubService(slug: string): SubService {
  return { id: `sub-${slug}`, slug, name: { fr: slug }, description: { fr: `Description ${slug}` } };
}

/** Service minimal du catalogue public ; le slug sert aussi de nom français. */
export function buildService(slug: string, subServices: SubService[] = []): Service {
  return {
    id: `svc-${slug}`,
    slug,
    name: { fr: slug },
    shortDescription: { fr: slug },
    fullDescription: { fr: slug },
    icon: 'Home',
    coverImage: '',
    galleryImages: [],
    videos: [],
    isActive: true,
    order: 0,
    subServices,
  };
}
