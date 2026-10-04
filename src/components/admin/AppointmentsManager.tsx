// src/components/admin/AppointmentsManager.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { Locale } from '@/lib/routing';
import type { Service } from '@/types';
import type { AppointmentSearchFiltersValues } from '@/lib/validation/appointment';
import { listAppointmentsAction, confirmAppointmentAction, cancelAppointmentAction } from '@/app/actions/admin/appointments';
import { AppointmentsFilters } from './AppointmentsFilters';
import { AppointmentsTable } from './AppointmentsTable';
import { CancelAppointmentDialog } from './CancelAppointmentDialog';
import { ExportButtons } from './ExportButtons';
import { ActionError } from '@/lib/errors';
import { useErrorMessage } from '@/lib/useErrorMessage';

/**
 * Composant pour gérer les rendez-vous.
 * `services` provient de la page Server Component parente (Supabase).
 */
export function AppointmentsManager({ locale, services }: { locale: Locale; services: Service[] }) {
  const [filters, setFilters] = useState<AppointmentSearchFiltersValues>({});
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const t = useTranslations('admin.appointments');
  const errorMessage = useErrorMessage();

  /**
   * Récupère la liste des rendez-vous en fonction des filtres.
   * Utilise React Query pour gérer l'état de chargement et les erreurs.
   */
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'appointments', filters],
    queryFn: async () => {
      const result = await listAppointmentsAction(filters);
      if (!result.success) throw new ActionError(result.error);
      return result.appointments;
    },
  });

  /**
   * Confirmation d'un RDV en attente. En cas de succès, on invalide la liste
   * pour refléter le nouveau statut — pas de mise à jour optimiste ici, le
   * volume de RDV ne le justifie pas et ça évite un état incohérent si le
   * serveur refuse (ex: RDV déjà annulé entre-temps par un autre admin).
   */
  const confirmMutation = useMutation({
    mutationFn: (appointmentId: string) => confirmAppointmentAction(appointmentId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'appointments'] });
      }
    },
  });

  /**
   * Annulation d'un RDV avec message optionnel — la modale reste ouverte tant
   * que l'action n'a pas répondu, pour afficher l'erreur au bon endroit si
   * le serveur refuse (ex: RDV déjà annulé entre-temps).
   */
  const cancelMutation = useMutation({
    mutationFn: (input: { appointmentId: string; reason: string }) => cancelAppointmentAction(input),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'appointments'] });
        setCancelTargetId(null);
        toast.success(t('cancelSuccess'));
      } else {
        toast.error(errorMessage(result.error));
      }
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:justify-between">
        <div className="flex-1">
          <AppointmentsFilters locale={locale} services={services} filters={filters} onChange={setFilters} />
        </div>
        <ExportButtons filters={filters} services={services} locale={locale} />
      </div>

      <AppointmentsTable
        locale={locale}
        services={services}
        appointments={data ?? []}
        isLoading={isLoading}
        onConfirm={(id) => confirmMutation.mutate(id)}
        confirmingId={confirmMutation.isPending ? (confirmMutation.variables ?? null) : null}
        confirmError={confirmMutation.data && !confirmMutation.data.success ? errorMessage(confirmMutation.data.error) : null}
        onCancel={(id) => setCancelTargetId(id)}
      />

      <CancelAppointmentDialog
        open={cancelTargetId !== null}
        onOpenChange={(open) => {
          if (!open) setCancelTargetId(null);
        }}
        isSubmitting={cancelMutation.isPending}
        onConfirm={(reason) => {
          if (cancelTargetId) cancelMutation.mutate({ appointmentId: cancelTargetId, reason });
        }}
      />
    </div>
  );
}
