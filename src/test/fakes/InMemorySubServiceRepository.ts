// src/test/fakes/InMemorySubServiceRepository.ts
import type { CatalogSubService, NewSubService, SubServiceContent } from '@/domain/service/CatalogService';
import type { SubServiceRepository } from '@/domain/service/SubServiceRepository';
import type { InMemoryServiceCatalog } from './InMemoryServiceCatalog';

/** Sous-prestations en mémoire, stockées dans l'état du catalogue partagé. */
export class InMemorySubServiceRepository implements SubServiceRepository {
  constructor(private readonly catalog: InMemoryServiceCatalog) {}

  async findById(id: string): Promise<CatalogSubService | null> {
    return this.all().find((sub) => sub.id === id) ?? null;
  }

  async slugExists(serviceId: string, slug: string): Promise<boolean> {
    return this.catalog.requireRow(serviceId).subServices.some((sub) => sub.slug === slug);
  }

  async create(draft: NewSubService): Promise<CatalogSubService> {
    const sub: CatalogSubService = { id: this.catalog.nextId('sub'), ...draft };
    this.catalog.requireRow(draft.serviceId).subServices.push(sub);
    return sub;
  }

  async updateContent(id: string, content: SubServiceContent): Promise<CatalogSubService> {
    const sub = this.all().find((s) => s.id === id);
    if (!sub) throw new Error(`Sous-prestation introuvable : ${id}`);
    Object.assign(sub, content);
    return sub;
  }

  async delete(id: string): Promise<void> {
    for (const service of this.catalog.rows) {
      service.subServices = service.subServices.filter((sub) => sub.id !== id);
    }
  }

  async reorder(serviceId: string, orderedIds: string[]): Promise<void> {
    this.catalog.requireRow(serviceId).subServices.forEach((sub) => (sub.order = orderedIds.indexOf(sub.id)));
  }

  private all(): CatalogSubService[] {
    return this.catalog.rows.flatMap((service) => service.subServices);
  }
}
