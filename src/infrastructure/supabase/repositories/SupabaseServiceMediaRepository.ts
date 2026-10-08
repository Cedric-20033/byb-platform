// src/infrastructure/supabase/repositories/SupabaseServiceMediaRepository.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { CatalogMedia, NewMedia } from '@/domain/service/CatalogService';
import type { ServiceMediaRepository } from '@/domain/service/ServiceMediaRepository';
import { DomainError } from '@/domain/shared/DomainError';
import { toMedia } from './catalogMappers';

/** Code SQLSTATE levé par `set_service_cover` quand le média n'appartient pas au service. */
const NO_DATA_FOUND = 'P0002';

export class SupabaseServiceMediaRepository implements ServiceMediaRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findById(id: string): Promise<CatalogMedia | null> {
    const { data, error } = await this.supabase.from('service_media').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toMedia(data) : null;
  }

  async add(media: NewMedia): Promise<CatalogMedia> {
    const { data, error } = await this.supabase
      .from('service_media')
      .insert({
        service_id: media.serviceId,
        type: media.type,
        public_id: media.publicId,
        is_cover: media.isCover,
        order: media.order,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toMedia(data);
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from('service_media').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async setCover(serviceId: string, mediaId: string): Promise<void> {
    const { error } = await this.supabase.rpc('set_service_cover', {
      p_service_id: serviceId,
      p_media_id: mediaId,
    });
    if (error?.code === NO_DATA_FOUND) throw new DomainError('Média introuvable.', 'MEDIA_NOT_FOUND');
    if (error) throw new Error(error.message);
  }

  async reorder(serviceId: string, orderedIds: string[]): Promise<void> {
    const { error } = await this.supabase.rpc('reorder_service_media', {
      p_service_id: serviceId,
      p_ordered_ids: orderedIds,
    });
    if (error) throw new Error(error.message);
  }
}
