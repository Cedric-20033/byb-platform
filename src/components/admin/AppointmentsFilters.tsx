// src/components/admin/AppointmentsFilters.tsx
'use client';

import { useTranslations } from 'next-intl';
import { RotateCcw } from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { DateInput } from '@/components/ui/DateInput';
import { Button } from '@/components/ui/Button';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import { getActiveServices } from '@/data/services';
import { t as translateField } from '@/lib/utils';
import type { Locale } from '@/lib/routing';
import type { AppointmentSearchFiltersValues } from '@/lib/validation/appointment';

interface AppointmentsFiltersProps {
  locale: Locale;
  filters: AppointmentSearchFiltersValues;
  onChange: (filters: AppointmentSearchFiltersValues) => void;
}

const services = getActiveServices();

/**
 * Composant pour les filtres des rendez-vous.
 * @param param0 
 * @returns 
 */
export function AppointmentsFilters({ locale, filters, onChange }: AppointmentsFiltersProps) {
  const t = useTranslations('admin.appointments');

  function set<K extends keyof AppointmentSearchFiltersValues>(key: K, value: AppointmentSearchFiltersValues[K]) {
    onChange({ ...filters, [key]: value || undefined });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <label className="flex flex-col gap-1 text-sm min-w-[220px] flex-1">
        <span className="font-medium">{t('searchPlaceholder')}</span>
        <input
          type="email"
          value={filters.clientEmail ?? ''}
          onChange={(e) => set('clientEmail', e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
        />
      </label>

      <Select label={t('filterStatus')} value={filters.status ?? ''} onChange={(e) => set('status', e.target.value as AppointmentStatus)} className="min-w-[160px]">
        <option value="">{t('allStatuses')}</option>
        <option value={AppointmentStatus.PENDING}>{t('statusPending')}</option>
        <option value={AppointmentStatus.CONFIRMED}>{t('statusConfirmed')}</option>
        <option value={AppointmentStatus.CANCELLED}>{t('statusCancelled')}</option>
      </Select>

      <Select label={t('filterService')} value={filters.serviceId ?? ''} onChange={(e) => set('serviceId', e.target.value)} className="min-w-[180px]">
        <option value="">{t('allServices')}</option>
        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {translateField(service.name, locale)}
          </option>
        ))}
      </Select>

      <DateInput label={t('filterDateFrom')} value={filters.dateFrom ?? ''} onChange={(e) => set('dateFrom', e.target.value)} />
      <DateInput label={t('filterDateTo')} value={filters.dateTo ?? ''} onChange={(e) => set('dateTo', e.target.value)} />

      <Button variant="ghost" size="sm" onClick={() => onChange({})} className="normal-case font-medium tracking-normal">
        <RotateCcw size={15} />
        {t('resetFilters')}
      </Button>
    </div>
  );
}
