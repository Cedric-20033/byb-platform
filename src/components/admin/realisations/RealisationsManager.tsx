// src/components/admin/realisations/RealisationsManager.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ExternalLink, ImagePlus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cloudinaryImageUrl } from '@/lib/cloudinary-url';
import { ADMIN_ROUTES, PUBLIC_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useCatalog } from '../services/catalogQuery';
import { matchesSearch } from '../services/matchesSearch';
import { summarizeMedia } from './realisationsSummary';

/**
 * Entrée des Réalisations : un service par ligne, avec le résumé de sa galerie. Les médias sont ceux
 * des services (`service_media`) : cet écran ne crée aucune donnée propre, il donne seulement un accès
 * direct à la gestion de la galerie, sans passer par l'édition complète du service.
 */
export function RealisationsManager() {
  const t = useTranslations('admin.realisations');
  const locale = useLocale() as Locale;
  const errorMessage = useErrorMessage();
  const catalog = useCatalog();
  const [search, setSearch] = useState('');

  const services = catalog.data ?? [];
  const visible = services.filter((service) => matchesSearch(service, search));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('search')}
          aria-label={t('search')}
          className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
        />
        <a href={getLocalizedPath(PUBLIC_ROUTES.REALISATIONS, locale)} target="_blank" rel="noreferrer">
          <Button type="button" variant="outline">
            <ExternalLink size={16} />
            {t('viewOnSite')}
          </Button>
        </a>
      </div>

      {catalog.isLoading ? (
        <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('loading')}</p>
      ) : catalog.isError ? (
        <div className="text-center py-6 space-y-2">
          <p className="text-sm text-[var(--color-secondary)]">{errorMessage(catalog.error)}</p>
          <Button size="sm" variant="outline" onClick={() => catalog.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <Card className="p-6 text-center text-sm text-[var(--color-muted)]">
          {search.trim() !== '' ? t('emptyFiltered') : t('empty')}
        </Card>
      ) : (
        <ul className="space-y-2">
          {visible.map((service) => {
            const { photos, videos, thumbnailPublicId } = summarizeMedia(service.media);
            return (
              <li
                key={service.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {thumbnailPublicId ? (
                    // eslint-disable-next-line @next/next/no-img-element -- miniature distante, pas de gain à l'optimiser
                    <img
                      src={cloudinaryImageUrl(thumbnailPublicId, { width: 160, height: 120 })}
                      alt=""
                      width={64}
                      height={48}
                      className="w-16 h-12 object-cover rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] shrink-0"
                    />
                  ) : (
                    <div aria-hidden className="w-16 h-12 rounded-[var(--radius-sm)] bg-[var(--color-surface-raised)] shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{service.name.fr}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {t('photos', { count: photos })} · {t('videos', { count: videos })}
                    </p>
                  </div>
                  {!service.isActive && (
                    <span title={t('archivedHint')}>
                      <Badge tone="neutral">{t('archived')}</Badge>
                    </span>
                  )}
                </div>

                <Link href={getLocalizedPath(`${ADMIN_ROUTES.REALISATIONS}/${service.id}`, locale)}>
                  <Button type="button" size="sm" variant="outline">
                    <ImagePlus size={14} />
                    {t('manage')}
                  </Button>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
