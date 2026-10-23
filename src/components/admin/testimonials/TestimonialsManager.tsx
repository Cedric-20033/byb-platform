// src/components/admin/testimonials/TestimonialsManager.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Eye, EyeOff, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import {
  deleteTestimonialAction,
  publishTestimonialAction,
  reorderTestimonialsAction,
  unpublishTestimonialAction,
} from '@/app/actions/admin/testimonials';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { TestimonialRecord } from '@/domain/testimonial/TestimonialRecord';
import { ADMIN_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { ConfirmDialog } from '../ConfirmDialog';
import { usePermissions } from '../PermissionsProvider';
import { SortableList } from '../SortableList';
import { matchesTestimonialSearch } from './matchesTestimonialSearch';
import { TESTIMONIALS_QUERY_KEY, useInvalidateTestimonials, useTestimonials } from './testimonialsQuery';

type StatusFilter = 'all' | 'published' | 'draft';

const ICON_BUTTON =
  'w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-foreground)] transition-colors';

export function TestimonialsManager() {
  const t = useTranslations('admin.testimonials');
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const invalidateTestimonials = useInvalidateTestimonials();
  const { can } = usePermissions();
  const testimonialsQuery = useTestimonials();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [toDelete, setToDelete] = useState<TestimonialRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canCreate = can('testimonials', 'create');
  const canEdit = can('testimonials', 'edit');
  const canDelete = can('testimonials', 'delete');

  const testimonials = testimonialsQuery.data ?? [];
  const isFiltered = search.trim() !== '' || status !== 'all';
  const visible = testimonials.filter(
    (item) =>
      matchesTestimonialSearch(item, search) && (status === 'all' || (status === 'published') === item.isPublished),
  );

  async function onReorder(ordered: TestimonialRecord[]) {
    const previous = queryClient.getQueryData<TestimonialRecord[]>(TESTIMONIALS_QUERY_KEY);
    // Mise à jour optimiste : la ligne reste où l'utilisateur l'a déposée pendant l'aller-retour serveur.
    queryClient.setQueryData(TESTIMONIALS_QUERY_KEY, ordered);
    try {
      unwrapAction(await reorderTestimonialsAction({ orderedIds: ordered.map((item) => item.id) }));
    } catch (error) {
      queryClient.setQueryData(TESTIMONIALS_QUERY_KEY, previous);
      toast.error(errorMessage(error));
    } finally {
      await invalidateTestimonials();
    }
  }

  async function togglePublished(item: TestimonialRecord) {
    try {
      const input = { testimonialId: item.id };
      unwrapAction(item.isPublished ? await unpublishTestimonialAction(input) : await publishTestimonialAction(input));
      toast.success(t(item.isPublished ? 'toast.unpublished' : 'toast.published'));
      await invalidateTestimonials();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      unwrapAction(await deleteTestimonialAction({ testimonialId: toDelete.id }));
      toast.success(t('toast.deleted'));
      await invalidateTestimonials();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsDeleting(false);
      setToDelete(null);
    }
  }

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
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as StatusFilter)}
          aria-label={t('filterStatus')}
          className="px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <option value="all">{t('status.all')}</option>
          <option value="published">{t('status.published')}</option>
          <option value="draft">{t('status.draft')}</option>
        </select>

        {canCreate && (
          <Link href={getLocalizedPath(`${ADMIN_ROUTES.TESTIMONIALS}/new`, locale)}>
            <Button type="button">
              <Plus size={16} />
              {t('add')}
            </Button>
          </Link>
        )}
      </div>

      {canEdit && (
        <p className="text-xs text-[var(--color-muted)]">{isFiltered ? t('reorderDisabled') : t('reorderHint')}</p>
      )}

      {testimonialsQuery.isLoading ? (
        <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('loading')}</p>
      ) : testimonialsQuery.isError ? (
        <div className="text-center py-6 space-y-2">
          <p className="text-sm text-[var(--color-secondary)]">{errorMessage(testimonialsQuery.error)}</p>
          <Button size="sm" variant="outline" onClick={() => testimonialsQuery.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <Card className="p-6 text-center text-sm text-[var(--color-muted)]">
          {isFiltered ? t('emptyFiltered') : t('empty')}
        </Card>
      ) : (
        <SortableList
          items={visible}
          getId={(item) => item.id}
          onReorder={onReorder}
          // Un ordre partiel (liste filtrée) n'aurait pas de sens : le tri exige la liste complète.
          disabled={!canEdit || isFiltered}
          className="space-y-2"
          itemClassName="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          renderItem={(item) => (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold truncate">
                    {item.authorName}
                    {item.authorLocation ? ` · ${item.authorLocation}` : ''}
                  </p>
                  <span className="flex items-center gap-1 text-xs text-[var(--color-muted)]">
                    <Star size={12} className="fill-current" aria-hidden />
                    {t('rating', { rating: item.rating })}
                  </span>
                  <Badge tone={item.isPublished ? 'success' : 'neutral'}>
                    {item.isPublished ? t('status.published') : t('status.draft')}
                  </Badge>
                </div>
                <p className="text-xs text-[var(--color-muted)] line-clamp-2">{item.content.fr}</p>
              </div>

              <div className="flex items-center gap-1">
                <Link
                  href={getLocalizedPath(`${ADMIN_ROUTES.TESTIMONIALS}/${item.id}`, locale)}
                  title={t('actions.edit')}
                  aria-label={t('actions.edit')}
                  className={ICON_BUTTON}
                >
                  <Pencil size={15} />
                </Link>
                {canEdit && (
                  <button
                    type="button"
                    title={item.isPublished ? t('actions.unpublish') : t('actions.publish')}
                    aria-label={item.isPublished ? t('actions.unpublish') : t('actions.publish')}
                    onClick={() => togglePublished(item)}
                    className={ICON_BUTTON}
                  >
                    {item.isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    title={t('actions.delete')}
                    aria-label={t('actions.delete')}
                    onClick={() => setToDelete(item)}
                    className={`${ICON_BUTTON} hover:!bg-[var(--color-secondary)]/10 hover:!text-[var(--color-secondary)]`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          )}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t('confirm.delete.title')}
        description={toDelete ? t('confirm.delete.description', { name: toDelete.authorName }) : ''}
        confirmLabel={t('confirm.confirm')}
        cancelLabel={t('confirm.cancel')}
        onConfirm={confirmDelete}
        isSubmitting={isDeleting}
        destructive
      />
    </div>
  );
}
