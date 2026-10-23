// src/application/services/ListServices.ts
import type { CatalogService } from '@/domain/service/CatalogService';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';

/** Use case : le catalogue complet pour l'écran d'administration, services archivés compris. Lecture seule, sans audit. */
export class ListServices {
  constructor(private readonly serviceRepository: ServiceRepository) {}

  execute(): Promise<CatalogService[]> {
    return this.serviceRepository.findAll();
  }
}
