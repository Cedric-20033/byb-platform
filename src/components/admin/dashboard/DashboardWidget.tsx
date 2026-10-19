// src/components/admin/dashboard/DashboardWidget.tsx
'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useErrorMessage } from '@/lib/useErrorMessage';

interface DashboardWidgetProps {
  title: string;
  subtitle?: string;
  /** Élément aligné à droite de l'en-tête (lien, pastille). */
  headerAction?: ReactNode;
  isPending: boolean;
  /** Erreur à afficher à la place du contenu (voir `useWidgetQuery`). */
  error: unknown;
  onRetry: () => void;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: ReactNode;
}

/**
 * Cadre commun des widgets : un seul endroit décide de l'affichage des quatre états
 * (chargement, erreur avec relance, vide, contenu), pour que tous se comportent de la même façon.
 */
export function DashboardWidget({
  title,
  subtitle,
  headerAction,
  isPending,
  error,
  onRetry,
  isEmpty = false,
  emptyMessage,
  children,
}: DashboardWidgetProps) {
  const t = useTranslations('admin.dashboard');
  const errorMessage = useErrorMessage();

  return (
    <Card className="p-5">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-[var(--color-muted)] mt-0.5">{subtitle}</p>}
        </div>
        {headerAction}
      </header>

      {isPending ? (
        <div role="status" aria-busy="true" aria-label={t('loading')} className="space-y-3">
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-10 rounded-[var(--radius-md)] bg-[var(--color-surface-raised)] animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="flex items-start gap-2 text-sm text-[var(--color-muted)]">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-[var(--color-secondary)]" aria-hidden />
            {errorMessage(error)}
          </p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            {t('retry')}
          </Button>
        </div>
      ) : isEmpty ? (
        <p className="text-sm text-[var(--color-muted)]">{emptyMessage}</p>
      ) : (
        children
      )}
    </Card>
  );
}
