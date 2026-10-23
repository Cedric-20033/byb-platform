// src/infrastructure/supabase/repositories/catalogMappers.ts
import type { Database, Json } from '@/types/database';
import type { CatalogMedia, CatalogService, CatalogSubService } from '@/domain/service/CatalogService';
import type { I18nText } from '@/domain/shared/I18nText';

type Tables = Database['public']['Tables'];
export type ServiceRow = Tables['services']['Row'];
export type SubServiceRow = Tables['sub_services']['Row'];
export type MediaRow = Tables['service_media']['Row'];

/** Ligne `services` avec ses relations, telle que renvoyée par SERVICE_SELECT. */
export type ServiceAggregateRow = ServiceRow & {
  sub_services: SubServiceRow[] | null;
  service_media: MediaRow[] | null;
};

/** Sélection de l'agrégat complet en une seule requête (pas de N+1). */
export const SERVICE_SELECT = '*, sub_services(*), service_media(*)';

/**
 * Les colonnes i18n sont du JSONB libre : on ne retient que les clés connues, de type
 * chaîne, pour qu'une donnée corrompue ne se propage pas jusqu'à l'interface.
 */
export function toI18nText(value: Json): I18nText {
  const raw = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, Json | undefined>;
  const text: I18nText = { fr: typeof raw.fr === 'string' ? raw.fr : '' };
  if (typeof raw.en === 'string') text.en = raw.en;
  if (typeof raw.de === 'string') text.de = raw.de;
  return text;
}

export function toSubService(row: SubServiceRow): CatalogSubService {
  return {
    id: row.id,
    serviceId: row.service_id,
    slug: row.slug,
    name: toI18nText(row.name),
    description: toI18nText(row.description),
    order: row.order,
  };
}

export function toMedia(row: MediaRow): CatalogMedia {
  return {
    id: row.id,
    serviceId: row.service_id,
    type: row.type,
    publicId: row.public_id,
    isCover: row.is_cover,
    order: row.order,
  };
}

const byOrder = <T extends { order: number }>(a: T, b: T) => a.order - b.order;

export function toCatalogService(row: ServiceAggregateRow): CatalogService {
  return {
    id: row.id,
    slug: row.slug,
    name: toI18nText(row.name),
    shortDescription: toI18nText(row.short_description),
    fullDescription: toI18nText(row.full_description),
    icon: row.icon,
    isActive: row.is_active,
    order: row.order,
    subServices: (row.sub_services ?? []).map(toSubService).sort(byOrder),
    media: (row.service_media ?? []).map(toMedia).sort(byOrder),
  };
}
