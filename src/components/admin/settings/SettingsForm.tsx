// src/components/admin/settings/SettingsForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { updateCompanySettingsAction } from '@/app/actions/admin/settings';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BOOKING_CONFIRMATION_MODES, type CompanySettings } from '@/domain/settings/CompanySettings';
import { SETTINGS_LIMITS } from '@/domain/settings/CompanySettingsRules';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useValidationMessage } from '@/lib/useValidationMessage';
import { cn } from '@/lib/utils';
import { companySettingsSchema, type CompanySettingsFormValues } from '@/lib/validation/settings';
import { usePermissions } from '../PermissionsProvider';
import { TRANSLATION_LOCALES, type TranslationLocale } from '../services/translationCompleteness';
import { emptySiteValues, toSettingsFormValues, withoutSite, withPrimarySite } from './settingsFormValues';
import { useInvalidateSettings } from './settingsQuery';

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] disabled:opacity-60';

/** Formulaire des réglages de l'entreprise (une seule fiche, enregistrée d'un bloc). */
export function SettingsForm({ settings }: { settings: CompanySettings }) {
  const t = useTranslations('admin.settings');
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const validationMessage = useValidationMessage();
  const invalidateSettings = useInvalidateSettings();
  const { can } = usePermissions();
  const canWrite = can('settings', 'edit');
  const [hoursTab, setHoursTab] = useState<TranslationLocale>('fr');

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompanySettingsFormValues>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: toSettingsFormValues(settings),
  });

  const { fields: siteFields, append, remove } = useFieldArray({ control, name: 'sites' });
  const sites = useWatch({ control, name: 'sites' });

  async function onSubmit(form: CompanySettingsFormValues) {
    try {
      const { settings: saved } = unwrapAction(await updateCompanySettingsAction(form));
      toast.success(t('toast.saved'));
      await invalidateSettings();
      // Les valeurs enregistrées (normalisées par le serveur) repartent comme état de référence.
      reset(toSettingsFormValues(saved));
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  function setPrimary(id: string) {
    withPrimarySite(getValues('sites'), id).forEach((site, index) => setValue(`sites.${index}.isPrimary`, site.isPrimary));
  }

  function removeSite(index: number) {
    const current = getValues('sites');
    const next = withoutSite(current, current[index].id);
    // `remove` met à jour la liste ; le principal éventuellement réattribué est appliqué ensuite.
    remove(index);
    next.forEach((site, i) => setValue(`sites.${i}.isPrimary`, site.isPrimary));
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      {!canWrite && <p className="text-sm text-[var(--color-muted)]">{t('readOnly')}</p>}

      <Card className="p-5 space-y-4">
        <SectionTitle title={t('sections.contact.title')} description={t('sections.contact.description')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('fields.phone')} error={errors.phone?.message} validationMessage={validationMessage}>
            <input type="tel" disabled={!canWrite} {...register('phone')} className={INPUT_CLASS} />
          </Field>
          <Field label={t('fields.mobile')} error={errors.mobile?.message} validationMessage={validationMessage}>
            <input type="tel" disabled={!canWrite} {...register('mobile')} className={INPUT_CLASS} />
          </Field>
          <Field label={t('fields.email')} error={errors.email?.message} validationMessage={validationMessage}>
            <input type="email" disabled={!canWrite} {...register('email')} className={INPUT_CLASS} />
          </Field>
          <Field label={t('fields.website')} error={errors.website?.message} validationMessage={validationMessage}>
            <input type="url" disabled={!canWrite} {...register('website')} className={INPUT_CLASS} />
          </Field>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <SectionTitle title={t('sections.social.title')} description={t('sections.social.description')} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('fields.facebook')} error={errors.facebookUrl?.message} validationMessage={validationMessage}>
            <input type="url" disabled={!canWrite} {...register('facebookUrl')} className={INPUT_CLASS} />
          </Field>
          <Field label={t('fields.instagram')} error={errors.instagramUrl?.message} validationMessage={validationMessage}>
            <input type="url" disabled={!canWrite} {...register('instagramUrl')} className={INPUT_CLASS} />
          </Field>
          <Field label={t('fields.linkedin')} error={errors.linkedinUrl?.message} validationMessage={validationMessage}>
            <input type="url" disabled={!canWrite} {...register('linkedinUrl')} className={INPUT_CLASS} />
          </Field>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <SectionTitle title={t('sections.hours.title')} description={t('sections.hours.description')} />
        <div role="tablist" className="flex gap-1">
          {TRANSLATION_LOCALES.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              id={`hours-tab-${tab}`}
              aria-selected={hoursTab === tab}
              aria-controls={`hours-panel-${tab}`}
              onClick={() => setHoursTab(tab)}
              className={cn(
                'px-3 py-1.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors',
                hoursTab === tab
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]',
              )}
            >
              {t(`tabs.${tab}`)}
            </button>
          ))}
        </div>
        {TRANSLATION_LOCALES.map((tab) => (
          <div
            key={tab}
            role="tabpanel"
            id={`hours-panel-${tab}`}
            aria-labelledby={`hours-tab-${tab}`}
            hidden={hoursTab !== tab}
            className="space-y-2"
          >
            {tab !== 'fr' && <p className="text-xs text-[var(--color-muted)]">{t('fallbackNote')}</p>}
            <Field
              label={t('fields.openingHours')}
              error={errors.openingHours?.[tab]?.message}
              validationMessage={validationMessage}
            >
              <textarea rows={3} disabled={!canWrite} {...register(`openingHours.${tab}`)} className={INPUT_CLASS} />
            </Field>
          </div>
        ))}
      </Card>

      <Card className="p-5 space-y-4">
        <SectionTitle title={t('sections.sites.title')} description={t('sections.sites.description')} />
        {errors.sites?.message && (
          <p role="alert" className="text-xs text-[var(--color-secondary)]">
            {validationMessage(errors.sites.message)}
          </p>
        )}
        {errors.sites?.root?.message && (
          <p role="alert" className="text-xs text-[var(--color-secondary)]">
            {validationMessage(errors.sites.root.message)}
          </p>
        )}

        <div className="space-y-4">
          {siteFields.map((field, index) => {
            const siteErrors = errors.sites?.[index];
            const isPrimary = sites?.[index]?.isPrimary ?? false;
            return (
              <fieldset key={field.id} className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-4 space-y-3">
                <legend className="px-1 text-sm font-semibold">{t('sites.siteTitle', { number: index + 1 })}</legend>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t('sites.name')} error={siteErrors?.name?.message} validationMessage={validationMessage}>
                    <input type="text" disabled={!canWrite} {...register(`sites.${index}.name`)} className={INPUT_CLASS} />
                  </Field>
                  <Field label={t('sites.street')} error={siteErrors?.street?.message} validationMessage={validationMessage}>
                    <input type="text" disabled={!canWrite} {...register(`sites.${index}.street`)} className={INPUT_CLASS} />
                  </Field>
                  <Field
                    label={t('sites.postalCode')}
                    error={siteErrors?.postalCode?.message}
                    validationMessage={validationMessage}
                  >
                    <input type="text" disabled={!canWrite} {...register(`sites.${index}.postalCode`)} className={INPUT_CLASS} />
                  </Field>
                  <Field label={t('sites.city')} error={siteErrors?.city?.message} validationMessage={validationMessage}>
                    <input type="text" disabled={!canWrite} {...register(`sites.${index}.city`)} className={INPUT_CLASS} />
                  </Field>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {TRANSLATION_LOCALES.map((tab) => (
                    <Field
                      key={tab}
                      label={`${t('sites.country')} (${tab.toUpperCase()})`}
                      error={siteErrors?.country?.[tab]?.message}
                      validationMessage={validationMessage}
                    >
                      <input
                        type="text"
                        disabled={!canWrite}
                        {...register(`sites.${index}.country.${tab}`)}
                        className={INPUT_CLASS}
                      />
                    </Field>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="primarySite"
                      checked={isPrimary}
                      disabled={!canWrite}
                      onChange={() => setPrimary(sites?.[index]?.id ?? field.id)}
                    />
                    {t('sites.primary')}
                  </label>

                  {canWrite && siteFields.length > SETTINGS_LIMITS.sites.min && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeSite(index)}>
                      <Trash2 size={14} aria-hidden /> {t('sites.remove')}
                    </Button>
                  )}
                </div>
              </fieldset>
            );
          })}
        </div>

        {canWrite && siteFields.length < SETTINGS_LIMITS.sites.max && (
          <Button type="button" variant="outline" size="sm" onClick={() => append(emptySiteValues(crypto.randomUUID()))}>
            <Plus size={14} aria-hidden /> {t('sites.add')}
          </Button>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <SectionTitle title={t('sections.notifications.title')} description={t('sections.notifications.description')} />
        <Field
          label={t('fields.adminNotificationEmail')}
          error={errors.adminNotificationEmail?.message}
          validationMessage={validationMessage}
        >
          <input type="email" disabled={!canWrite} {...register('adminNotificationEmail')} className={INPUT_CLASS} />
        </Field>
      </Card>

      <Card className="p-5 space-y-4">
        <SectionTitle title={t('sections.booking.title')} description={t('sections.booking.description')} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={t('booking.minNotice')}
            hint={t('booking.minNoticeHint')}
            error={errors.booking?.minNoticeMinutes?.message}
            validationMessage={validationMessage}
          >
            <input
              type="number"
              inputMode="numeric"
              disabled={!canWrite}
              {...register('booking.minNoticeMinutes', { valueAsNumber: true })}
              className={INPUT_CLASS}
            />
          </Field>
          <Field
            label={t('booking.horizon')}
            hint={t('booking.horizonHint')}
            error={errors.booking?.horizonDays?.message}
            validationMessage={validationMessage}
          >
            <input
              type="number"
              inputMode="numeric"
              disabled={!canWrite}
              {...register('booking.horizonDays', { valueAsNumber: true })}
              className={INPUT_CLASS}
            />
          </Field>
          <Field
            label={t('booking.maxUpcoming')}
            hint={t('booking.maxUpcomingHint')}
            error={errors.booking?.maxUpcomingPerEmail?.message}
            validationMessage={validationMessage}
          >
            <input
              type="number"
              inputMode="numeric"
              disabled={!canWrite}
              {...register('booking.maxUpcomingPerEmail', { valueAsNumber: true })}
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        <Field
          label={t('booking.confirmationMode')}
          hint={t('booking.confirmationHint')}
          error={errors.booking?.confirmationMode?.message}
          validationMessage={validationMessage}
        >
          <select disabled={!canWrite} {...register('booking.confirmationMode')} className={INPUT_CLASS}>
            {BOOKING_CONFIRMATION_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {t(`booking.modes.${mode}`)}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label={t('booking.defaultSlotMinutes')}
            error={errors.booking?.defaultSlotMinutes?.message}
            validationMessage={validationMessage}
          >
            <input
              type="number"
              inputMode="numeric"
              disabled={!canWrite}
              {...register('booking.defaultSlotMinutes', { valueAsNumber: true })}
              className={INPUT_CLASS}
            />
          </Field>
          <Field
            label={t('booking.defaultStartTime')}
            error={errors.booking?.defaultStartTime?.message}
            validationMessage={validationMessage}
          >
            <input type="time" disabled={!canWrite} {...register('booking.defaultStartTime')} className={INPUT_CLASS} />
          </Field>
          <Field
            label={t('booking.defaultEndTime')}
            error={errors.booking?.defaultEndTime?.message}
            validationMessage={validationMessage}
          >
            <input type="time" disabled={!canWrite} {...register('booking.defaultEndTime')} className={INPUT_CLASS} />
          </Field>
        </div>
        <p className="text-xs text-[var(--color-muted)]">{t('booking.defaultsHint')}</p>
      </Card>

      {canWrite && (
        <div className="flex justify-end">
          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? t('saving') : t('save')}
          </Button>
        </div>
      )}
    </form>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-[var(--color-muted)]">{description}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  validationMessage,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  validationMessage: (message: string | undefined) => string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <p className="text-xs text-[var(--color-muted)]">{hint}</p>}
      {error && <p className="text-xs text-[var(--color-secondary)]">{validationMessage(error)}</p>}
    </label>
  );
}
