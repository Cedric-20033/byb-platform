// src/test/fakes/InMemoryServiceCatalog.ts
import type { CatalogService, NewService, ServiceContent } from '@/domain/service/CatalogService';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import type { ServiceUsageReader } from '@/domain/service/ServiceUsageReader';

/**
 * Catalogue en mémoire : porte les services et, par composition, l'état partagé des
 * sous-prestations et des médias (voir InMemorySubServiceRepository / InMemoryServiceMediaRepository).
 * En base ce sont des tables liées par clés étrangères ; l'état partagé permet de simuler la cascade
 * (supprimer un service emporte ses enfants).
 */
export class InMemoryServiceCatalog implements ServiceRepository, ServiceUsageReader {
  /** État brut, mutable : réservé aux fakes frères. */
  rows: CatalogService[] = [];
  private sequence = 0;
  /** Services référencés par un rendez-vous (pilote `hasAppointments`). */
  readonly bookedServiceIds = new Set<string>();

  nextId(prefix: string): string {
    return `${prefix}-${++this.sequence}`;
  }

  requireRow(id: string): CatalogService {
    const service = this.rows.find((s) => s.id === id);
    if (!service) throw new Error(`Service introuvable : ${id}`);
    return service;
  }

  /** Aide aux assertions : copie triée comme le ferait la base. */
  snapshot(): CatalogService[] {
    return [...this.rows]
      .sort((a, b) => a.order - b.order)
      .map((service) => ({
        ...service,
        subServices: [...service.subServices].sort((a, b) => a.order - b.order),
        media: [...service.media].sort((a, b) => a.order - b.order),
      }));
  }

  async findAll(): Promise<CatalogService[]> {
    return this.snapshot();
  }

  async findById(id: string): Promise<CatalogService | null> {
    return this.snapshot().find((service) => service.id === id) ?? null;
  }

  async slugExists(slug: string): Promise<boolean> {
    return this.rows.some((service) => service.slug === slug);
  }

  async create(draft: NewService): Promise<CatalogService> {
    const service: CatalogService = { id: this.nextId('service'), ...draft, subServices: [], media: [] };
    this.rows.push(service);
    return service;
  }

  async updateContent(id: string, content: ServiceContent): Promise<CatalogService> {
    const service = this.requireRow(id);
    Object.assign(service, content);
    return service;
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    this.requireRow(id).isActive = isActive;
  }

  async delete(id: string): Promise<void> {
    this.rows = this.rows.filter((service) => service.id !== id);
  }

  async reorder(orderedIds: string[]): Promise<void> {
    orderedIds.forEach((id, index) => (this.requireRow(id).order = index));
  }

  async hasAppointments(serviceId: string): Promise<boolean> {
    return this.bookedServiceIds.has(serviceId);
  }
}
