// src/components/admin/AppointmentsManager.tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Locale } from '@/lib/routing';
import type { AppointmentSearchFiltersValues } from '@/lib/validation/appointment';
import { listAppointmentsAction } from '@/app/actions/admin/appointments';
import { AppointmentsFilters } from './AppointmentsFilters';
import { AppointmentsTable } from './AppointmentsTable';
import { ExportButtons } from './ExportButtons';

/**
 * Composant pour gérer les rendez-vous.
 * 
 * @param param0 
 * @returns 
 */
export function AppointmentsManager({ locale }: { locale: Locale }) {
  const [filters, setFilters] = useState<AppointmentSearchFiltersValues>({});

  /**
   * Récupère la liste des rendez-vous en fonction des filtres.
   * Utilise React Query pour gérer l'état de chargement et les erreurs.
   * 
   * @returns 
   */
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'appointments', filters],
    queryFn: async () => {
      const result = await listAppointmentsAction(filters);
      if (!result.success) throw new Error(result.error);
      return result.appointments;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:justify-between">
        <div className="flex-1">
          <AppointmentsFilters locale={locale} filters={filters} onChange={setFilters} />
        </div>
        <ExportButtons filters={filters} />
      </div>

      <AppointmentsTable locale={locale} appointments={data ?? []} isLoading={isLoading} />
    </div>
  );
}
