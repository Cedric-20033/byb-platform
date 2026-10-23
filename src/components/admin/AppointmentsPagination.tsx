// src/components/admin/AppointmentsPagination.tsx
'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';

type AppointmentsPaginationProps = {
  /** Page affichée, à partir de 1. */
  page: number;
  pageSize: number;
  /** Nombre total de résultats, toutes pages confondues. */
  total: number;
  onPageChange: (page: number) => void;
};

/** Pied de tableau : plage affichée, total et navigation. Masqué quand il n'y a aucun résultat. */
export function AppointmentsPagination({ page, pageSize, total, onPageChange }: AppointmentsPaginationProps) {
  const t = useTranslations('admin.appointments.pagination');

  if (total === 0) return null;

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav aria-label={t('page', { page, pages })} className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-[var(--color-muted)]">{t('summary', { from, to, total })}</p>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={16} aria-hidden="true" />
          {t('previous')}
        </Button>
        <span aria-current="page" className="px-2 tabular-nums">
          {t('page', { page, pages })}
        </span>
        <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          {t('next')}
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
