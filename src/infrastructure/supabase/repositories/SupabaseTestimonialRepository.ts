// src/infrastructure/supabase/repositories/SupabaseTestimonialRepository.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { DomainError } from '@/domain/shared/DomainError';
import type { NewTestimonial, TestimonialContent, TestimonialRecord } from '@/domain/testimonial/TestimonialRecord';
import type { PublishedTestimonialReader } from '@/domain/testimonial/PublishedTestimonialReader';
import type { TestimonialRepository } from '@/domain/testimonial/TestimonialRepository';
import { toI18nText } from './catalogMappers';

type TestimonialRow = Database['public']['Tables']['testimonials']['Row'];

function toTestimonial(row: TestimonialRow): TestimonialRecord {
  return {
    id: row.id,
    authorName: row.author_name,
    authorLocation: row.author_location,
    content: toI18nText(row.content),
    rating: row.rating,
    date: row.testimonial_date,
    avatarPublicId: row.avatar_public_id,
    isPublished: row.is_published,
    order: row.order,
  };
}

/**
 * Modèle d'écriture des témoignages, et lecture publique des témoignages publiés.
 *
 * Les requêtes d'écriture passent par le client de l'appelant : la RLS (0020) est la seconde barrière
 * derrière `assertPermission()`. La lecture publique filtre `is_published` EXPLICITEMENT : sans cela,
 * un admin connecté qui consulte le site verrait aussi les brouillons (sa policy de lecture les inclut).
 */
export class SupabaseTestimonialRepository implements TestimonialRepository, PublishedTestimonialReader {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async findAll(): Promise<TestimonialRecord[]> {
    const { data, error } = await this.supabase.from('testimonials').select('*').order('order');
    if (error) throw new Error(error.message);
    return data.map(toTestimonial);
  }

  async findPublished(): Promise<TestimonialRecord[]> {
    const { data, error } = await this.supabase
      .from('testimonials')
      .select('*')
      .eq('is_published', true)
      .order('order');
    if (error) throw new Error(error.message);
    return data.map(toTestimonial);
  }

  async findById(id: string): Promise<TestimonialRecord | null> {
    const { data, error } = await this.supabase.from('testimonials').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toTestimonial(data) : null;
  }

  async create(testimonial: NewTestimonial): Promise<TestimonialRecord> {
    const { data, error } = await this.supabase
      .from('testimonials')
      .insert({
        author_name: testimonial.authorName,
        author_location: testimonial.authorLocation,
        content: testimonial.content,
        rating: testimonial.rating,
        testimonial_date: testimonial.date,
        avatar_public_id: testimonial.avatarPublicId,
        is_published: testimonial.isPublished,
        order: testimonial.order,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return toTestimonial(data);
  }

  async updateContent(id: string, content: TestimonialContent): Promise<TestimonialRecord> {
    const { data, error } = await this.supabase
      .from('testimonials')
      .update({
        author_name: content.authorName,
        author_location: content.authorLocation,
        content: content.content,
        rating: content.rating,
        testimonial_date: content.date,
      })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    // Aucune ligne : témoignage absent, ou écriture filtrée par la RLS.
    if (!data) throw new DomainError('Témoignage introuvable.', 'TESTIMONIAL_NOT_FOUND');
    return toTestimonial(data);
  }

  async setPublished(id: string, isPublished: boolean): Promise<void> {
    const { error } = await this.supabase.from('testimonials').update({ is_published: isPublished }).eq('id', id);
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from('testimonials').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  async reorder(orderedIds: string[]): Promise<void> {
    const { error } = await this.supabase.rpc('reorder_testimonials', { p_ordered_ids: orderedIds });
    if (error) throw new Error(error.message);
  }
}
