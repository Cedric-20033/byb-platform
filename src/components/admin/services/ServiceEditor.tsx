// src/components/admin/services/ServiceEditor.tsx
'use client';

import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/Card';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useCatalog } from './catalogQuery';
import { ServiceForm } from './ServiceForm';
import { ServiceMediaManager } from './ServiceMediaManager';
import { SubServicesEditor } from './SubServicesEditor';

/**
 * Fiche d'un service. Sans `serviceId`, c'est la création : le formulaire seul est proposé, les
 * sous-prestations et les médias exigent un service existant (leur identifiant en dépend).
 */
export function ServiceEditor({ serviceId }: { serviceId?: string }) {
  const t = useTranslations('admin.catalog');
  const errorMessage = useErrorMessage();
  const catalog = useCatalog();

  if (!serviceId) {
    return (
      <div className="space-y-6">
        <ServiceForm />
        <Card className="p-5 text-sm text-[var(--color-muted)] space-y-1">
          <p>{t('subServices.saveFirst')}</p>
          <p>{t('media.saveFirst')}</p>
        </Card>
      </div>
    );
  }

  if (catalog.isLoading) {
    return <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('loading')}</p>;
  }
  if (catalog.isError) {
    return <p className="text-sm text-[var(--color-secondary)] text-center py-6">{errorMessage(catalog.error)}</p>;
  }

  const service = catalog.data?.find((item) => item.id === serviceId);
  if (!service) notFound();

  return (
    <div className="space-y-6">
      {/* `key` : repart de valeurs neuves si l'on passe d'un service à un autre sans démonter la page. */}
      <ServiceForm key={service.id} service={service} />
      <SubServicesEditor service={service} />
      <ServiceMediaManager service={service} />
    </div>
  );
}
