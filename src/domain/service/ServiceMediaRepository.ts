// src/domain/service/ServiceMediaRepository.ts
import type { CatalogMedia, NewMedia } from './CatalogService';

export interface ServiceMediaRepository {
  findById(id: string): Promise<CatalogMedia | null>;
  add(media: NewMedia): Promise<CatalogMedia>;
  remove(id: string): Promise<void>;
  /**
   * Fait de ce média l'unique couverture de son service. L'implémentation doit être
   * atomique : la base n'admet qu'une couverture par service, un retrait puis une pose
   * en deux requêtes laisserait un état intermédiaire visible (ou une collision).
   */
  setCover(serviceId: string, mediaId: string): Promise<void>;
  /** Applique l'ordre 0..n-1 donné aux médias d'un service. */
  reorder(serviceId: string, orderedIds: string[]): Promise<void>;
}
