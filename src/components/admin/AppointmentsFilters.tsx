// src/components/admin/AppointmentsFilters.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FormField } from '@/components/auth/FormField';
import { Button } from '@/components/ui/Button';
import { DateInput } from '@/components/ui/DateInput';
import { Select } from '@/components/ui/Select';
import { AppointmentStatus } from '@/domain/appointment/Appointment';
import type { Locale } from '@/lib/routing';
import { t as translateField } from '@/lib/utils';
import type { AppointmentSearchFiltersValues } from '@/lib/validation/appointment';
import type { Service } from '@/types';

/** Délai de saisie avant de lancer la recherche : évite une requête par frappe. */
const SEARCH_DEBOUNCE_MS = 300;

const STATUS_LABEL_KEYS = {
  [AppointmentStatus.PENDING]: 'statusPending',
  [AppointmentStatus.CONFIRMED]: 'statusConfirmed',
  [AppointmentStatus.CANCELLED]: 'statusCancelled',
} as const;

type AppointmentsFiltersProps = {
  locale: Locale;
  services: Service[];
  filters: AppointmentSearchFiltersValues;
  onChange: (filters: AppointmentSearchFiltersValues) => void;
};

/** Filtres de la liste : recherche texte (nom, email, téléphone), statut, service et période. */
export function AppointmentsFilters({ locale, services, filters, onChange }: AppointmentsFiltersProps) {
  const t = useTranslations('admin.appointments');
  const [text, setText] = useState(filters.query ?? '');

  // Les rappels différés lisent toujours la dernière valeur des filtres : sans cela, changer le statut
  // pendant le délai de saisie serait écrasé par les filtres capturés au moment de la frappe.
  const latest = useRef({ filters, onChange });
  useEffect(() => {
    latest.current = { filters, onChange };
  });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  /** Applique un filtre ; une valeur vide le retire, pour ne pas polluer l'URL de paramètres vides. */
  function update(key: keyof AppointmentSearchFiltersValues, value: string) {
    const next: AppointmentSearchFiltersValues = { ...latest.current.filters };
    if (value === '') delete next[key];
    else Object.assign(next, { [key]: value });
    latest.current.onChange(next);
  }

  function handleTextChange(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => update('query', value.trim()), SEARCH_DEBOUNCE_MS);
  }

  function reset() {
    clearTimeout(timer.current);
    setText('');
    onChange({});
  }

  const hasFilters = Object.keys(filters).length > 0 || text !== '';

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-[14rem] flex-1">
        <FormField
          label={t('searchLabel')}
          type="search"
          autoComplete="off"
          placeholder={t('searchHint')}
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
        />
      </div>

      <Select
        label={t('filterStatus')}
        value={filters.status ?? ''}
        onChange={(event) => update('status', event.target.value)}
      >
        <option value="">{t('allStatuses')}</option>
        {Object.values(AppointmentStatus).map((status) => (
          <option key={status} value={status}>
            {t(STATUS_LABEL_KEYS[status])}
          </option>
        ))}
      </Select>

      <Select label={t('filterService')} value={filters.serviceId ?? ''} onChange={(event) => update('serviceId', event.target.value)}>
        <option value="">{t('allServices')}</option>
        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {translateField(service.name, locale)}
          </option>
        ))}
      </Select>

      <DateInput label={t('filterDateFrom')} value={filters.dateFrom ?? ''} onChange={(event) => update('dateFrom', event.target.value)} />
      <DateInput label={t('filterDateTo')} value={filters.dateTo ?? ''} onChange={(event) => update('dateTo', event.target.value)} />

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={reset}>
          {t('resetFilters')}
        </Button>
      )}
    </div>
  );
}
