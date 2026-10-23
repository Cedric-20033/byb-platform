// src/components/admin/services/ServiceForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Controller, useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Check, CircleAlert } from 'lucide-react';
import { createServiceAction, updateServiceAction } from '@/app/actions/admin/services';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { CatalogService } from '@/domain/service/CatalogService';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useValidationMessage } from '@/lib/useValidationMessage';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { ADMIN_ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { createServiceSchema, type ServiceFormValues } from '@/lib/validation/services';
import { usePermissions } from '../PermissionsProvider';
import { IconPicker } from './IconPicker';
import { useInvalidateCatalog } from './catalogQuery';
import {
  TRANSLATION_LOCALES,
  countCompleteLocales,
  isLocaleComplete,
  type TranslationLocale,
} from './translationCompleteness';

const TRANSLATABLE_FIELDS = ['name', 'shortDescription', 'fullDescription'] as const;
const DEFAULT_ICON = 'Hammer';

type ServiceFormProps = {
  /** Absent à la création. */
  service?: CatalogService;
};

function toFormValues(service?: CatalogService): ServiceFormValues {
  const text = (value?: { fr: string; en?: string; de?: string }) => ({
    fr: value?.fr ?? '',
    en: value?.en ?? '',
    de: value?.de ?? '',
  });

  return {
    name: text(service?.name),
    shortDescription: text(service?.shortDescription),
    fullDescription: text(service?.fullDescription),
    icon: service?.icon ?? DEFAULT_ICON,
    slug: service?.slug ?? '',
  };
}

/** Une langue est « en erreur » dès qu'un de ses champs est invalide, même si son onglet est masqué. */
function localeHasError(errors: FieldErrors<ServiceFormValues>, locale: TranslationLocale): boolean {
  return TRANSLATABLE_FIELDS.some((field) => Boolean(errors[field]?.[locale]));
}

export function ServiceForm({ service }: ServiceFormProps) {
  const t = useTranslations('admin.catalog.form');
  const tToast = useTranslations('admin.catalog.toast');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const validationMessage = useValidationMessage();
  const invalidateCatalog = useInvalidateCatalog();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<TranslationLocale>('fr');

  const isEdit = Boolean(service);
  const canWrite = can('services', isEdit ? 'edit' : 'create');

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: toFormValues(service),
  });

  const values = useWatch({ control });
  const completeCount = countCompleteLocales(values, TRANSLATABLE_FIELDS);

  async function onSubmit(form: ServiceFormValues) {
    try {
      if (service) {
        const { slug: _slug, ...content } = form;
        void _slug; // Le slug est figé : il n'est jamais renvoyé à la mise à jour.
        unwrapAction(await updateServiceAction({ serviceId: service.id, ...content }));
        toast.success(tToast('updated'));
        await invalidateCatalog();
        router.refresh();
        return;
      }

      const { service: created } = unwrapAction(await createServiceAction({ ...form, slug: form.slug || undefined }));
      toast.success(tToast('created'));
      await invalidateCatalog();
      router.push(getLocalizedPath(`${ADMIN_ROUTES.SERVICES}/${created.id}`, locale));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {!canWrite && <p className="text-sm text-[var(--color-muted)]">{t('readOnly')}</p>}

      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" className="flex gap-1">
            {TRANSLATION_LOCALES.map((tab) => {
              const complete = isLocaleComplete(values, TRANSLATABLE_FIELDS, tab);
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  id={`tab-${tab}`}
                  aria-selected={activeTab === tab}
                  aria-controls={`panel-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors',
                    activeTab === tab
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]',
                  )}
                >
                  {t(`tabs.${tab}`)}
                  {tab === 'fr' && <span className="text-[10px] uppercase opacity-80">{t('required')}</span>}
                  {tab !== 'fr' &&
                    (complete ? (
                      <Check size={13} aria-label={t('tabComplete')} />
                    ) : (
                      <CircleAlert size={13} aria-label={t('tabIncomplete')} />
                    ))}
                  {localeHasError(errors, tab) && (
                    <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)]" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="w-full sm:w-56 space-y-1">
            <p className="text-xs text-[var(--color-muted)]">
              {t('completeness', { done: completeCount, total: TRANSLATION_LOCALES.length })}
            </p>
            <div className="h-1.5 rounded-full bg-[var(--color-surface-raised)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-primary)] transition-all"
                style={{ width: `${(completeCount / TRANSLATION_LOCALES.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {TRANSLATION_LOCALES.map((tab) => (
          <div
            key={tab}
            role="tabpanel"
            id={`panel-${tab}`}
            aria-labelledby={`tab-${tab}`}
            hidden={activeTab !== tab}
            className="space-y-4"
          >
            {tab !== 'fr' && <p className="text-xs text-[var(--color-muted)]">{t('fallbackNote')}</p>}

            <Field label={t('name')} error={errors.name?.[tab]?.message} validationMessage={validationMessage}>
              <input type="text" disabled={!canWrite} {...register(`name.${tab}`)} className={INPUT_CLASS} />
            </Field>
            <Field
              label={t('shortDescription')}
              error={errors.shortDescription?.[tab]?.message}
              validationMessage={validationMessage}
            >
              <textarea rows={2} disabled={!canWrite} {...register(`shortDescription.${tab}`)} className={INPUT_CLASS} />
            </Field>
            <Field
              label={t('fullDescription')}
              error={errors.fullDescription?.[tab]?.message}
              validationMessage={validationMessage}
            >
              <textarea rows={6} disabled={!canWrite} {...register(`fullDescription.${tab}`)} className={INPUT_CLASS} />
            </Field>
          </div>
        ))}
      </Card>

      <Card className="p-5 space-y-4">
        {/* Pas de <label> englobant : il déclencherait le premier bouton de la grille d'icônes. */}
        <div className="space-y-1">
          <span className="text-sm font-medium">{t('icon')}</span>
          <Controller
            control={control}
            name="icon"
            render={({ field }) => <IconPicker value={field.value} onChange={field.onChange} disabled={!canWrite} />}
          />
          {errors.icon?.message && (
            <p className="text-xs text-[var(--color-secondary)]">{validationMessage(errors.icon.message)}</p>
          )}
        </div>

        <Field label={t('slug')} error={errors.slug?.message} validationMessage={validationMessage}>
          <input
            type="text"
            // Le slug fait partie des URL publiques : modifiable uniquement à la création.
            disabled={isEdit || !canWrite}
            {...register('slug')}
            className={INPUT_CLASS}
          />
          <p className="text-xs text-[var(--color-muted)] mt-1">{isEdit ? t('slugLocked') : t('slugHint')}</p>
        </Field>
      </Card>

      {canWrite && (
        <div className="flex justify-end">
          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? t('saving') : isEdit ? t('save') : t('create')}
          </Button>
        </div>
      )}
    </form>
  );
}

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] disabled:opacity-60';

function Field({
  label,
  error,
  validationMessage,
  children,
}: {
  label: string;
  error?: string;
  validationMessage: (message: string | undefined) => string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {error && <p className="text-xs text-[var(--color-secondary)]">{validationMessage(error)}</p>}
    </label>
  );
}
