// src/infrastructure/supabase/repositories/SupabaseServiceRepository.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { Service, SubService, ServiceVideo, I18nField } from '@/types';

type ServiceRow = Database['public']['Tables']['services']['Row'];
type SubServiceRow = Database['public']['Tables']['sub_services']['Row'];
type ServiceMediaInsert = Database['public']['Tables']['service_media']['Insert'];

/** Un média prêt à être persisté — déjà uploadé, on ne stocke que sa référence. */
export type MediaToPersist = {
  type: 'image' | 'video';
  publicId: string;
  order: number;
  isCover: boolean;
};

/**
 * Implémentation Supabase du repository de catalogue services.
 *
 * Les méthodes d'écriture suivent une stratégie "replace" (delete puis
 * insert) plutôt qu'un diff fin : adaptée à un catalogue de la taille de
 * BYB (dix métiers), lue en intégralité à chaque migration, et idempotente
 * par construction — relancer scripts/migrate-services-to-supabase.ts ne
 * produit jamais de doublons.
 */
export class SupabaseServiceRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findAll(options: { activeOnly?: boolean } = {}): Promise<Service[]> {
    let query = this.supabase.from('services').select('*').order('order');
    if (options.activeOnly) query = query.eq('is_active', true);

    const { data: serviceRows, error } = await query;
    if (error) throw new Error(error.message);

    const services: Service[] = [];
    for (const row of serviceRows) {
      services.push(await this.hydrate(row));
    }
    return services;
  }

  async findBySlug(slug: string): Promise<Service | null> {
    const { data: row, error } = await this.supabase.from('services').select('*').eq('slug', slug).maybeSingle();
    if (error) throw new Error(error.message);
    return row ? this.hydrate(row) : null;
  }

  /** Crée le service s'il n'existe pas (par slug), ou met à jour ses champs. Retourne son id. */
  async upsertService(service: Service): Promise<string> {
    const { data, error } = await this.supabase
      .from('services')
      .upsert(
        {
          slug: service.slug,
          name: service.name as unknown as Database['public']['Tables']['services']['Insert']['name'],
          short_description: service.shortDescription as unknown as Database['public']['Tables']['services']['Insert']['short_description'],
          full_description: service.fullDescription as unknown as Database['public']['Tables']['services']['Insert']['full_description'],
          icon: service.icon,
          is_active: service.isActive,
          order: service.order,
        },
        { onConflict: 'slug' },
      )
      .select('id')
      .single();

    if (error) throw new Error(`Échec upsert service "${service.slug}" : ${error.message}`);
    return data.id;
  }

  /** Remplace intégralement les sous-services d'un service. */
  async replaceSubServices(serviceId: string, subServices: SubService[]): Promise<void> {
    const { error: deleteError } = await this.supabase
      .from('sub_services')
      .delete()
      .eq('service_id', serviceId);
    if (deleteError) throw new Error(`Échec suppression sub_services : ${deleteError.message}`);

    if (subServices.length === 0) return;

    const { error: insertError } = await this.supabase.from('sub_services').insert(
      subServices.map((sub, index) => ({
        service_id: serviceId,
        slug: sub.slug,
        name: sub.name as unknown as Database['public']['Tables']['sub_services']['Insert']['name'],
        description: sub.description as unknown as Database['public']['Tables']['sub_services']['Insert']['description'],
        order: index,
      })),
    );
    if (insertError) throw new Error(`Échec insertion sub_services : ${insertError.message}`);
  }

  /** Remplace intégralement la galerie média (images + vidéos) d'un service. */
  async replaceMedia(serviceId: string, media: MediaToPersist[]): Promise<void> {
    const { error: deleteError } = await this.supabase
      .from('service_media')
      .delete()
      .eq('service_id', serviceId);
    if (deleteError) throw new Error(`Échec suppression service_media : ${deleteError.message}`);

    if (media.length === 0) return;

    const rows: ServiceMediaInsert[] = media.map((m) => ({
      service_id: serviceId,
      type: m.type,
      public_id: m.publicId,
      order: m.order,
      is_cover: m.isCover,
    }));

    const { error: insertError } = await this.supabase.from('service_media').insert(rows);
    if (insertError) throw new Error(`Échec insertion service_media : ${insertError.message}`);
  }

  /** Reconstruit un Service applicatif complet (sous-services + médias) depuis une ligne `services`. */
  private async hydrate(row: ServiceRow): Promise<Service> {
    const [{ data: subServiceRows, error: subError }, { data: mediaRows, error: mediaError }] = await Promise.all([
      this.supabase.from('sub_services').select('*').eq('service_id', row.id).order('order'),
      this.supabase.from('service_media').select('*').eq('service_id', row.id).order('order'),
    ]);
    if (subError) throw new Error(subError.message);
    if (mediaError) throw new Error(mediaError.message);

    const images = (mediaRows ?? []).filter((m) => m.type === 'image');
    const videos: ServiceVideo[] = (mediaRows ?? [])
      .filter((m) => m.type === 'video')
      .map((m) => ({ id: m.id, publicId: m.public_id, order: m.order }));

    const cover = images.find((m) => m.is_cover) ?? images[0];

    return {
      id: row.id,
      slug: row.slug,
      name: row.name as unknown as I18nField,
      shortDescription: row.short_description as unknown as I18nField,
      fullDescription: row.full_description as unknown as I18nField,
      icon: row.icon,
      coverImage: cover?.public_id ?? '',
      galleryImages: images.filter((m) => m.id !== cover?.id).map((m) => m.public_id),
      videos,
      isActive: row.is_active,
      order: row.order,
      subServices: (subServiceRows ?? []).map((sub: SubServiceRow) => ({
        id: sub.id,
        slug: sub.slug,
        name: sub.name as unknown as I18nField,
        description: sub.description as unknown as I18nField,
      })),
    };
  }
}
