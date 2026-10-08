// src/domain/service/SubServiceRepository.ts
import type { CatalogSubService, NewSubService, SubServiceContent } from './CatalogService';

export interface SubServiceRepository {
  findById(id: string): Promise<CatalogSubService | null>;
  /** Le slug n'est unique qu'au sein d'un même service. */
  slugExists(serviceId: string, slug: string): Promise<boolean>;
  create(subService: NewSubService): Promise<CatalogSubService>;
  updateContent(id: string, content: SubServiceContent): Promise<CatalogSubService>;
  delete(id: string): Promise<void>;
  /** Applique l'ordre 0..n-1 donné aux sous-services d'un service. */
  reorder(serviceId: string, orderedIds: string[]): Promise<void>;
}
