// src/infrastructure/supabase/repositories/SupabaseServiceCatalogRepository.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { CatalogService, NewService, ServiceContent } from '@/domain/service/CatalogService';
import type { ServiceRepository } from '@/domain/service/ServiceRepository';
import type { ServiceUsageReader } from '@/domain/service/ServiceUsageReader';
import { DomainError } from '@/domain/shared/DomainError';
import { SERVICE_SELECT, toCatalogService, type ServiceAggregateRow } from './catalogMappers';

/**
 * Modèle d'écriture du catalogue. Distinct de `SupabaseServiceRepository` (lecture publique,
 * aplati pour l'affichage) : ici l'agrégat garde les identifiants et les traductions brutes.
 *
 * Toutes les requêtes passent par le client de l'appelant : la RLS (0006) est la seconde barrière
 * derrière `assertPermission()`.
 */
export class SupabaseServiceCatalogRepository implements ServiceRepository, ServiceUsageReader {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findAll(): Promise<CatalogService[]> {
    const { data, error } = await this.supabase.from('services').select(SERVICE_SELECT).order('order');
    if (error) throw new Error(error.message);
    return (data as ServiceAggregateRow[]).map(toCatalogService);
  }

  async findById(id: string): Promise<CatalogService | null> {
    const { data, error } = await this.supabase.from('services').select(SERVICE_SELECT).eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toCatalogService(data as ServiceAggregateRow) : null;
  }

  async slugExists(slug: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }

  async create(service: NewService): Promise<CatalogService> {
    const { data, error } = await this.supabase
      .from('services')
      .insert({
        slug: service.slug,
        name: service.name,
        short_description: service.shortDescription,
        full_description: service.fullDescription,
        icon: service.icon,
        is_active: service.isActive,
        order: service.order,
      })
      .select(SERVICE_SELECT)
      .single();
    // 23505 : course entre deux créations avec le même slug, que `slugExists` n'a pas pu voir.
    if (error?.code === '23505') throw new DomainError('Slug de service déjà utilisé.', 'SERVICE_SLUG_TAKEN');
    if (error) throw new Error(error.message);
    return toCatalogService(data as ServiceAggregateRow);
  }

  async updateContent(id: string, content: ServiceContent): Promise<CatalogService> {
    const { data, error } = await this.supabase
      .from('services')
      .update({
        name: content.name,
        short_description: content.shortDescription,
        full_description: content.fullDescription,
        icon: content.icon,
      })
      .eq('id', id)
      .select(SERVICE_SELECT)
      .maybeSingle();
    if (error) throw new Error(error.message);
    // Aucune ligne : service absent, ou écriture filtrée par la RLS.
    if (!data) throw new DomainError('Service introuvable.', 'SERVICE_NOT_FOUND');
    return toCatalogService(data as ServiceAggregateRow);
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await this.supabase.from('services').update({ is_active: isActive }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('services').delete().eq('id', id);
    // 23503 : filet de sécurité si un rendez-vous a été créé entre la vérification et la suppression.
    if (error?.code === '23503') {
      throw new DomainError('Des rendez-vous référencent ce service.', 'SERVICE_HAS_APPOINTMENTS');
    }
    if (error) throw new Error(error.message);
  }

  async reorder(orderedIds: string[]): Promise<void> {
    const { error } = await this.supabase.rpc('reorder_services', { p_ordered_ids: orderedIds });
    if (error) throw new Error(error.message);
  }

  async hasAppointments(serviceId: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', serviceId);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }
}
