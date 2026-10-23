// src/infrastructure/supabase/repositories/SupabaseSubServiceRepository.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { CatalogSubService, NewSubService, SubServiceContent } from '@/domain/service/CatalogService';
import type { SubServiceRepository } from '@/domain/service/SubServiceRepository';
import { DomainError } from '@/domain/shared/DomainError';
import { toSubService } from './catalogMappers';

export class SupabaseSubServiceRepository implements SubServiceRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<CatalogSubService | null> {
    const { data, error } = await this.supabase.from('sub_services').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toSubService(data) : null;
  }

  async slugExists(serviceId: string, slug: string): Promise<boolean> {
    const { count, error } = await this.supabase
      .from('sub_services')
      .select('id', { count: 'exact', head: true })
      .eq('service_id', serviceId)
      .eq('slug', slug);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }

  async create(subService: NewSubService): Promise<CatalogSubService> {
    const { data, error } = await this.supabase
      .from('sub_services')
      .insert({
        service_id: subService.serviceId,
        slug: subService.slug,
        name: subService.name,
        description: subService.description,
        order: subService.order,
      })
      .select()
      .single();
    if (error?.code === '23505') throw new DomainError('Slug de sous-service déjà utilisé.', 'SUB_SERVICE_SLUG_TAKEN');
    if (error) throw new Error(error.message);
    return toSubService(data);
  }

  async updateContent(id: string, content: SubServiceContent): Promise<CatalogSubService> {
    const { data, error } = await this.supabase
      .from('sub_services')
      .update({ name: content.name, description: content.description })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new DomainError('Sous-service introuvable.', 'SUB_SERVICE_NOT_FOUND');
    return toSubService(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('sub_services').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async reorder(serviceId: string, orderedIds: string[]): Promise<void> {
    const { error } = await this.supabase.rpc('reorder_sub_services', {
      p_service_id: serviceId,
      p_ordered_ids: orderedIds,
    });
    if (error) throw new Error(error.message);
  }
}
