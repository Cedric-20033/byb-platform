// src/components/admin/realisations/RealisationEditor.tsx
'use client';

import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useCatalog } from '../services/catalogQuery';
import { ServiceMediaManager } from '../services/ServiceMediaManager';

/**
 * Galerie d'un service, vue « Réalisations ». Réutilise `ServiceMediaManager` tel quel : mêmes Server
 * Actions, mêmes permissions `services.*` et même sécurité en base que sur la fiche du service. Il n'y a
 * donc qu'un seul endroit où la logique des médias est écrite.
 */
export function RealisationEditor({ serviceId }: { serviceId: string }) {
  const t = useTranslations('admin.realisations');
  const errorMessage = useErrorMessage();
  const catalog = useCatalog();

  if (catalog.isLoading) {
    return <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('loading')}</p>;
  }
  if (catalog.isError) {
    return <p className="text-sm text-[var(--color-secondary)] text-center py-6">{errorMessage(catalog.error)}</p>;
  }

  const service = catalog.data?.find((item) => item.id === serviceId);
  if (!service) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-[var(--font-display)] font-bold">{service.name.fr}</h2>
        <p className="text-sm text-[var(--color-muted)]">{t('serviceHint')}</p>
        {!service.isActive && <p className="text-sm text-[var(--color-secondary)] mt-1">{t('archivedHint')}</p>}
      </div>

      <ServiceMediaManager service={service} />
    </div>
  );
}
