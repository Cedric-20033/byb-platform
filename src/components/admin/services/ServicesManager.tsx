// src/components/admin/services/ServicesManager.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArchiveRestore, Archive, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  archiveServiceAction,
  deleteServiceAction,
  reorderServicesAction,
  restoreServiceAction,
} from '@/app/actions/admin/services';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { CatalogService } from '@/domain/service/CatalogService';
import { ADMIN_ROUTES, PUBLIC_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { ConfirmDialog } from '../ConfirmDialog';
import { SortableList } from '../SortableList';
import { usePermissions } from '../PermissionsProvider';
import { CATALOG_QUERY_KEY, useCatalog, useInvalidateCatalog } from './catalogQuery';
import { SERVICE_ICONS } from './IconPicker';
import { matchesSearch } from './matchesSearch';

type StatusFilter = 'all' | 'active' | 'inactive';
type PendingAction = { kind: 'archive' | 'restore' | 'delete'; service: CatalogService } | null;

export function ServicesManager() {
  const t = useTranslations('admin.catalog');
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const invalidateCatalog = useInvalidateCatalog();
  const { can } = usePermissions();
  const catalog = useCatalog();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [pending, setPending] = useState<PendingAction>(null);
  const [isRunning, setIsRunning] = useState(false);

  const canCreate = can('services', 'create');
  const canEdit = can('services', 'edit');
  const canDelete = can('services', 'delete');

  const services = catalog.data ?? [];
  const isFiltered = search.trim() !== '' || status !== 'all';
  const visible = services.filter(
    (service) =>
      matchesSearch(service, search) &&
      (status === 'all' || (status === 'active') === service.isActive),
  );

  async function onReorder(ordered: CatalogService[]) {
    const previous = queryClient.getQueryData<CatalogService[]>(CATALOG_QUERY_KEY);
    // Mise à jour optimiste : la ligne reste où l'utilisateur l'a déposée pendant l'aller-retour serveur.
    queryClient.setQueryData(CATALOG_QUERY_KEY, ordered);
    try {
      unwrapAction(await reorderServicesAction({ orderedIds: ordered.map((service) => service.id) }));
    } catch (error) {
      queryClient.setQueryData(CATALOG_QUERY_KEY, previous);
      toast.error(errorMessage(error));
    } finally {
      await invalidateCatalog();
    }
  }

  async function confirmPending() {
    if (!pending) return;
    const { kind, service } = pending;
    setIsRunning(true);
    try {
      if (kind === 'archive') unwrapAction(await archiveServiceAction({ serviceId: service.id }));
      if (kind === 'restore') unwrapAction(await restoreServiceAction({ serviceId: service.id }));
      if (kind === 'delete') unwrapAction(await deleteServiceAction({ serviceId: service.id }));
      toast.success(t(`toast.${{ archive: 'archived', restore: 'restored', delete: 'deleted' }[kind]}`));
      await invalidateCatalog();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsRunning(false);
      setPending(null);
    }
  }

  const editHref = (service: CatalogService) => getLocalizedPath(`${ADMIN_ROUTES.SERVICES}/${service.id}`, locale);

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
          <option value="active">{t('status.active')}</option>
          <option value="inactive">{t('status.inactive')}</option>
        </select>

        {canCreate && (
          <Link href={getLocalizedPath(`${ADMIN_ROUTES.SERVICES}/new`, locale)}>
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
          {isFiltered ? t('emptyFiltered') : t('empty')}
        </Card>
      ) : (
        <SortableList
          items={visible}
          getId={(service) => service.id}
          onReorder={onReorder}
          // Un ordre partiel (liste filtrée) n'aurait pas de sens : le tri exige la liste complète.
          disabled={!canEdit || isFiltered}
          className="space-y-2"
          itemClassName="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
          renderItem={(service) => {
            const Icon = SERVICE_ICONS[service.icon];
            return (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {Icon && <Icon size={20} className="text-[var(--color-primary)] shrink-0" aria-hidden />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{service.name.fr}</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      /{service.slug} ·{' '}
                      {t('counts', { media: service.media.length, subs: service.subServices.length })}
                    </p>
                  </div>
                  <Badge tone={service.isActive ? 'success' : 'neutral'}>
                    {service.isActive ? t('status.active') : t('status.inactive')}
                  </Badge>
                </div>

                <div className="flex items-center gap-1">
                  {service.isActive && (
                    <a
                      href={getLocalizedPath(`${PUBLIC_ROUTES.SERVICES}/${service.slug}`, locale)}
                      target="_blank"
                      rel="noreferrer"
                      title={t('actions.preview')}
                      aria-label={t('actions.preview')}
                      className={ICON_BUTTON}
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                  <Link href={editHref(service)} title={t('actions.edit')} aria-label={t('actions.edit')} className={ICON_BUTTON}>
                    <Pencil size={15} />
                  </Link>
                  {canEdit && (
                    <button
                      type="button"
                      title={service.isActive ? t('actions.archive') : t('actions.restore')}
                      aria-label={service.isActive ? t('actions.archive') : t('actions.restore')}
                      onClick={() => setPending({ kind: service.isActive ? 'archive' : 'restore', service })}
                      className={ICON_BUTTON}
                    >
                      {service.isActive ? <Archive size={15} /> : <ArchiveRestore size={15} />}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      title={t('actions.delete')}
                      aria-label={t('actions.delete')}
                      onClick={() => setPending({ kind: 'delete', service })}
                      className={`${ICON_BUTTON} hover:!bg-[var(--color-secondary)]/10 hover:!text-[var(--color-secondary)]`}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          }}
        />
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? t(`confirm.${pending.kind}.title`) : ''}
        description={pending ? t(`confirm.${pending.kind}.description`, { name: pending.service.name.fr }) : ''}
        confirmLabel={t('confirm.confirm')}
        cancelLabel={t('confirm.cancel')}
        onConfirm={confirmPending}
        isSubmitting={isRunning}
        destructive={pending?.kind === 'delete' || pending?.kind === 'archive'}
      />
    </div>
  );
}

const ICON_BUTTON =
  'w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-foreground)] transition-colors';
