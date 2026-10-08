// src/application/services/requireService.ts
import type { CatalogService } from '@/domain/service/CatalogService';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import { DomainError } from '@/domain/shared/DomainError';

/** Charge un service ou lève `SERVICE_NOT_FOUND` : point de départ commun des use cases d'édition. */
export async function requireService(repository: ServiceRepository, serviceId: string): Promise<CatalogService> {
  const service = await repository.findById(serviceId);
  if (!service) throw new DomainError(`Service introuvable : ${serviceId}`, 'SERVICE_NOT_FOUND');
  return service;
}
