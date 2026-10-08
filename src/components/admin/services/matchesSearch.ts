// src/components/admin/services/matchesSearch.ts
import type { CatalogService } from '@/domain/service/CatalogService';

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Recherche insensible à la casse et aux accents, sur les trois langues et le slug. */
export function matchesSearch(service: Pick<CatalogService, 'slug' | 'name'>, query: string): boolean {
  const needle = normalize(query.trim());
  if (!needle) return true;

  return [service.slug, service.name.fr, service.name.en, service.name.de].some(
    (value) => value !== undefined && normalize(value).includes(needle),
  );
}
