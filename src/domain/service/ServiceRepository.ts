// src/domain/service/ServiceRepository.ts
import type { CatalogService, NewService, ServiceContent } from './CatalogService';

/** Port d'écriture/lecture des services (agrégat complet : sous-services et médias inclus). */
export interface ServiceRepository {
  /** Tous les services, actifs ou non, triés par `order`. */
  findAll(): Promise<CatalogService[]>;
  findById(id: string): Promise<CatalogService | null>;
  slugExists(slug: string): Promise<boolean>;
  create(service: NewService): Promise<CatalogService>;
  updateContent(id: string, content: ServiceContent): Promise<CatalogService>;
  setActive(id: string, isActive: boolean): Promise<void>;
  /** Supprime le service ; sous-services, médias et créneaux partent avec lui (cascade). */
  delete(id: string): Promise<void>;
  /** Applique l'ordre 0..n-1 donné, en une seule opération atomique. */
  reorder(orderedIds: string[]): Promise<void>;
}
