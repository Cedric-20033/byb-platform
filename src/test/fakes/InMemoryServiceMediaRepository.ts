// src/test/fakes/InMemoryServiceMediaRepository.ts
import type { CatalogMedia, NewMedia } from '@/domain/service/CatalogService';
import type { ServiceMediaRepository } from '@/domain/service/ServiceMediaRepository';
import type { InMemoryServiceCatalog } from './InMemoryServiceCatalog';

/** Médias en mémoire, stockés dans l'état du catalogue partagé. */
export class InMemoryServiceMediaRepository implements ServiceMediaRepository {
  constructor(private readonly catalog: InMemoryServiceCatalog) {}

  async findById(id: string): Promise<CatalogMedia | null> {
    return this.catalog.rows.flatMap((service) => service.media).find((media) => media.id === id) ?? null;
  }

  async add(draft: NewMedia): Promise<CatalogMedia> {
    const media: CatalogMedia = { id: this.catalog.nextId('media'), ...draft };
    this.catalog.requireRow(draft.serviceId).media.push(media);
    return media;
  }

  async remove(id: string): Promise<void> {
    for (const service of this.catalog.rows) {
      service.media = service.media.filter((media) => media.id !== id);
    }
  }

  async setCover(serviceId: string, mediaId: string): Promise<void> {
    this.catalog.requireRow(serviceId).media.forEach((media) => (media.isCover = media.id === mediaId));
  }

  async reorder(serviceId: string, orderedIds: string[]): Promise<void> {
    this.catalog.requireRow(serviceId).media.forEach((media) => (media.order = orderedIds.indexOf(media.id)));
  }
}
