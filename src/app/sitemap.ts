// src/app/sitemap.ts
import type { MetadataRoute } from 'next';
import { createServiceRoleClient } from '@/infrastructure/supabase/serviceRoleClient';
import { buildSitemapEntries } from '@/lib/seo/sitemapEntries';

/** Slugs des services actifs. Une base illisible ne doit jamais empêcher la génération du sitemap. */
async function loadActiveServiceSlugs(): Promise<string[]> {
  try {
    const { data, error } = await createServiceRoleClient().from('services').select('slug').eq('is_active', true);
    if (error) throw new Error(error.message);
    return data.map((row) => row.slug);
  } catch (error) {
    console.error('[sitemap] Services illisibles, sitemap limité aux pages statiques :', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemapEntries(await loadActiveServiceSlugs());
}
