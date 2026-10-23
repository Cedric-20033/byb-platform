// src/components/admin/testimonials/TestimonialForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Check, CircleAlert } from 'lucide-react';
import { createTestimonialAction, updateTestimonialAction } from '@/app/actions/admin/testimonials';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { TestimonialRecord } from '@/domain/testimonial/TestimonialRecord';
import { toIsoDate } from '@/domain/shared/IsoDate';
import { MAX_RATING, MIN_RATING } from '@/domain/testimonial/TestimonialRules';
import { ADMIN_ROUTES } from '@/lib/constants';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useValidationMessage } from '@/lib/useValidationMessage';
import { cn } from '@/lib/utils';
import { createTestimonialSchema, type TestimonialFormValues } from '@/lib/validation/testimonials';
import { usePermissions } from '../PermissionsProvider';
import {
  TRANSLATION_LOCALES,
  countCompleteLocales,
  isLocaleComplete,
  type TranslationLocale,
} from '../services/translationCompleteness';
import { useInvalidateTestimonials } from './testimonialsQuery';

const TRANSLATABLE_FIELDS = ['content'] as const;
const RATINGS = Array.from({ length: MAX_RATING - MIN_RATING + 1 }, (_, index) => MAX_RATING - index);

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] disabled:opacity-60';

function toFormValues(testimonial?: TestimonialRecord): TestimonialFormValues {
  return {
    authorName: testimonial?.authorName ?? '',
    authorLocation: testimonial?.authorLocation ?? '',
    content: {
      fr: testimonial?.content.fr ?? '',
      en: testimonial?.content.en ?? '',
      de: testimonial?.content.de ?? '',
    },
    rating: testimonial?.rating ?? MAX_RATING,
    // Jour calendaire de l'entreprise (Bruxelles) : `toISOString()` décalerait d'un jour autour de minuit.
    date: testimonial?.date ?? toIsoDate(new Date()),
  };
}

/** Formulaire d'un témoignage (création ou édition). Sans `testimonial`, c'est la création. */
export function TestimonialForm({ testimonial }: { testimonial?: TestimonialRecord }) {
  const t = useTranslations('admin.testimonials.form');
  const tToast = useTranslations('admin.testimonials.toast');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const validationMessage = useValidationMessage();
  const invalidateTestimonials = useInvalidateTestimonials();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<TranslationLocale>('fr');

  const isEdit = Boolean(testimonial);
  const canWrite = can('testimonials', isEdit ? 'edit' : 'create');

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TestimonialFormValues>({
    resolver: zodResolver(createTestimonialSchema),
    defaultValues: toFormValues(testimonial),
  });

  const values = useWatch({ control });
  const completeCount = countCompleteLocales(values, TRANSLATABLE_FIELDS);

  async function onSubmit(form: TestimonialFormValues) {
    try {
      if (testimonial) {
        unwrapAction(await updateTestimonialAction({ testimonialId: testimonial.id, ...form }));
        toast.success(tToast('updated'));
        await invalidateTestimonials();
        router.refresh();
        return;
      }

      const { testimonial: created } = unwrapAction(await createTestimonialAction(form));
      toast.success(tToast('created'));
      await invalidateTestimonials();
      router.push(getLocalizedPath(`${ADMIN_ROUTES.TESTIMONIALS}/${created.id}`, locale));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {!canWrite && <p className="text-sm text-[var(--color-muted)]">{t('readOnly')}</p>}

      <Card className="p-5 grid gap-4 sm:grid-cols-2">
        <Field label={t('authorName')} error={errors.authorName?.message} validationMessage={validationMessage}>
          <input type="text" disabled={!canWrite} {...register('authorName')} className={INPUT_CLASS} />
        </Field>

        <Field label={t('authorLocation')} error={errors.authorLocation?.message} validationMessage={validationMessage}>
          <input type="text" disabled={!canWrite} {...register('authorLocation')} className={INPUT_CLASS} />
        </Field>

        <Field label={t('rating')} error={errors.rating?.message} validationMessage={validationMessage}>
          {/* `valueAsNumber` : le <select> fournit une chaîne, le schéma attend un entier. */}
          <select disabled={!canWrite} {...register('rating', { valueAsNumber: true })} className={INPUT_CLASS}>
            {RATINGS.map((rating) => (
              <option key={rating} value={rating}>
                {t('ratingOption', { count: rating })}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('date')} error={errors.date?.message} validationMessage={validationMessage}>
          <input type="date" disabled={!canWrite} {...register('date')} className={INPUT_CLASS} />
        </Field>
      </Card>

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
                  id={`testimonial-tab-${tab}`}
                  aria-selected={activeTab === tab}
                  aria-controls={`testimonial-panel-${tab}`}
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
                  {Boolean(errors.content?.[tab]) && (
                    <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-[var(--color-secondary)]" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-xs text-[var(--color-muted)]">
            {t('completeness', { done: completeCount, total: TRANSLATION_LOCALES.length })}
          </p>
        </div>

        {TRANSLATION_LOCALES.map((tab) => (
          <div
            key={tab}
            role="tabpanel"
            id={`testimonial-panel-${tab}`}
            aria-labelledby={`testimonial-tab-${tab}`}
            hidden={activeTab !== tab}
            className="space-y-2"
          >
            {tab !== 'fr' && <p className="text-xs text-[var(--color-muted)]">{t('fallbackNote')}</p>}
            <Field label={t('content')} error={errors.content?.[tab]?.message} validationMessage={validationMessage}>
              <textarea rows={6} disabled={!canWrite} {...register(`content.${tab}`)} className={INPUT_CLASS} />
            </Field>
          </div>
        ))}
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
