// src/components/admin/AppointmentsManager.tsx
'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { Locale } from '@/lib/routing';
import type { Service } from '@/types';
import type { AppointmentClientValues, CreateAppointmentByAdminValues } from '@/lib/validation/appointment';
import {
  listAppointmentsAction,
  confirmAppointmentAction,
  cancelAppointmentAction,
  createAppointmentByAdminAction,
  deleteAppointmentAction,
  rescheduleAppointmentAction,
  updateAppointmentDetailsAction,
} from '@/app/actions/admin/appointments';
import { Button } from '@/components/ui/Button';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { AppointmentDetailsDialog } from './AppointmentDetailsDialog';
import { AppointmentsFilters } from './AppointmentsFilters';
import { AppointmentsPagination } from './AppointmentsPagination';
import { AppointmentsTable } from './AppointmentsTable';
import { CancelAppointmentDialog } from './CancelAppointmentDialog';
import { CreateAppointmentDialog } from './CreateAppointmentDialog';
import { DeleteAppointmentDialog } from './DeleteAppointmentDialog';
import { EditAppointmentDialog } from './EditAppointmentDialog';
import { ExportButtons } from './ExportButtons';
import { usePermissions } from './PermissionsProvider';
import { RescheduleAppointmentDialog } from './RescheduleAppointmentDialog';
import { parseListState, serializeListState, toggleSort, type AppointmentsListState } from './appointmentsUrlState';

/**
 * Cible d'une modale : l'id survit à la fermeture, pour que la modale garde son contenu pendant
 * l'animation de sortie (le parent ne la démonte pas, il la ferme).
 */
function useDialogTarget(initialId: string | null = null) {
  const [target, setTarget] = useState<{ id: string | null; open: boolean }>({ id: initialId, open: initialId !== null });
  return {
    id: target.id,
    open: target.open,
    show: (id: string) => setTarget({ id, open: true }),
    setOpen: (open: boolean) => setTarget((current) => ({ ...current, open })),
  };
}

/**
 * Composant pour gérer les rendez-vous.
 * `services` provient de la page Server Component parente (Supabase).
 *
 * Filtres, page et tri vivent dans l'URL (voir appointmentsUrlState) : la vue est partageable et survit
 * à un rechargement. Une seule modale est ouverte à la fois : passer de la fiche à une autre action la ferme.
 */
export function AppointmentsManager({
  locale,
  services,
  initialOpenId = null,
}: {
  locale: Locale;
  services: Service[];
  /** Fiche à ouvrir dès l'affichage (lien depuis une notification) ; la page remonte le composant quand elle change. */
  initialOpenId?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const t = useTranslations('admin.appointments');
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const canEdit = can('appointments', 'edit');
  const canCreate = can('appointments', 'create');
  const canDelete = can('appointments', 'delete');

  const listState = useMemo(() => parseListState(new URLSearchParams(searchParams.toString())), [searchParams]);

  function updateListState(next: AppointmentsListState) {
    const query = serializeListState(next).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const [createOpen, setCreateOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState<string | null>(null);
  const details = useDialogTarget(initialOpenId);
  const edit = useDialogTarget();
  const reschedule = useDialogTarget();
  const deletion = useDialogTarget();

  /**
   * Page de rendez-vous selon l'état de l'URL. `keepPreviousData` garde l'ancienne page affichée pendant
   * le chargement de la suivante : le tableau ne clignote pas à chaque changement de tri ou de page.
   */
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'appointments', listState],
    queryFn: async () =>
      unwrapAction(
        await listAppointmentsAction({
          filters: listState.filters,
          page: listState.page,
          sort: listState.sort,
          direction: listState.direction,
        }),
      ),
    placeholderData: keepPreviousData,
  });
  const appointments = data?.appointments ?? [];
  const findAppointment = (id: string | null) => appointments.find((appointment) => appointment.id === id) ?? null;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'appointments'] });

  /**
   * Confirmation d'un RDV en attente. En cas de succès, on invalide la liste
   * pour refléter le nouveau statut — pas de mise à jour optimiste ici, le
   * volume de RDV ne le justifie pas et ça évite un état incohérent si le
   * serveur refuse (ex: RDV déjà annulé entre-temps par un autre admin).
   */
  const confirmMutation = useMutation({
    mutationFn: (appointmentId: string) => confirmAppointmentAction(appointmentId),
    onSuccess: (result) => {
      if (result.success) refresh();
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
        refresh();
        setCancelTargetId(null);
        toast.success(t('cancelSuccess'));
      } else {
        toast.error(errorMessage(result.error));
      }
    },
  });

  /**
   * Mutations de la fiche et des modales. Elles rejettent en cas d'échec (`unwrapAction`) : la modale
   * concernée reste ouverte avec la saisie, et l'erreur traduite est affichée en toast.
   */
  const createMutation = useMutation({
    mutationFn: async (values: CreateAppointmentByAdminValues) => unwrapAction(await createAppointmentByAdminAction(values)),
    onSuccess: () => {
      refresh();
      toast.success(t('create.success'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: async (input: AppointmentClientValues & { appointmentId: string }) =>
      unwrapAction(await updateAppointmentDetailsAction(input)),
    onSuccess: () => {
      refresh();
      toast.success(t('edit.success'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const rescheduleMutation = useMutation({
    mutationFn: async (input: { appointmentId: string; newSlotId: string }) =>
      unwrapAction(await rescheduleAppointmentAction(input)),
    onSuccess: () => {
      refresh();
      toast.success(t('reschedule.success'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: async (appointmentId: string) => unwrapAction(await deleteAppointmentAction(appointmentId)),
    onSuccess: () => {
      refresh();
      toast.success(t('delete.success'));
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const confirmError = confirmMutation.data && !confirmMutation.data.success ? errorMessage(confirmMutation.data.error) : null;
  const confirmingId = confirmMutation.isPending ? (confirmMutation.variables ?? null) : null;

  // Sans le droit correspondant, les callbacks restent absents : tableau et fiche masquent alors les boutons.
  // Le serveur et le RLS refuseraient de toute façon l'action, mais l'interface ne doit pas la proposer.
  const requestConfirm = canEdit ? (id: string) => confirmMutation.mutate(id) : undefined;
  const requestCancel = canEdit ? (id: string) => setCancelTargetId(id) : undefined;

  /** Ferme la fiche puis ouvre l'action choisie : une seule modale à la fois. */
  const fromDetails = (open: (id: string) => void) => (id: string) => {
    details.setOpen(false);
    open(id);
  };

  const detailsAppointment = findAppointment(details.id);
  const editAppointment = findAppointment(edit.id);
  const rescheduleAppointment = findAppointment(reschedule.id);
  const deletionAppointment = findAppointment(deletion.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start gap-3 lg:justify-between">
        <div className="flex-1">
          <AppointmentsFilters
            locale={locale}
            services={services}
            filters={listState.filters}
            // Changer un filtre change l'ensemble des résultats : on repart de la première page.
            onChange={(filters) => updateListState({ ...listState, filters, page: 1 })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canCreate && (
            <Button variant="primary" size="md" onClick={() => setCreateOpen(true)}>
              <Plus size={16} aria-hidden="true" className="mr-1" />
              {t('create.open')}
            </Button>
          )}
          <ExportButtons filters={listState.filters} services={services} locale={locale} />
        </div>
      </div>

      <AppointmentsTable
        locale={locale}
        services={services}
        appointments={appointments}
        isLoading={isLoading}
        sort={{ field: listState.sort, direction: listState.direction }}
        onSortChange={(field) => updateListState(toggleSort(listState, field))}
        onSelect={details.show}
        onConfirm={requestConfirm}
        confirmingId={confirmingId}
        confirmError={confirmError}
        onCancel={requestCancel}
      />

      <AppointmentsPagination
        page={data?.page ?? listState.page}
        pageSize={data?.pageSize ?? 20}
        total={data?.total ?? 0}
        onPageChange={(page) => updateListState({ ...listState, page })}
      />

      <AppointmentDetailsDialog
        appointment={detailsAppointment}
        open={details.open}
        onOpenChange={details.setOpen}
        locale={locale}
        services={services}
        onConfirm={requestConfirm}
        onCancel={canEdit ? fromDetails(setCancelTargetId) : undefined}
        onEdit={canEdit ? fromDetails(edit.show) : undefined}
        onReschedule={canEdit ? fromDetails(reschedule.show) : undefined}
        onDelete={canDelete ? fromDetails(deletion.show) : undefined}
        isConfirming={confirmingId !== null && confirmingId === details.id}
        confirmError={confirmError}
      />

      {canCreate && (
        <CreateAppointmentDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          services={services}
          locale={locale}
          onSubmit={async (values) => {
            await createMutation.mutateAsync(values);
          }}
        />
      )}

      <EditAppointmentDialog
        appointment={editAppointment}
        open={edit.open}
        onOpenChange={edit.setOpen}
        onSubmit={async (values) => {
          if (!edit.id) return;
          await updateMutation.mutateAsync({ ...values, appointmentId: edit.id });
        }}
      />

      <RescheduleAppointmentDialog
        appointment={rescheduleAppointment}
        open={reschedule.open}
        onOpenChange={reschedule.setOpen}
        locale={locale}
        onSubmit={async (newSlotId) => {
          if (!reschedule.id) return;
          await rescheduleMutation.mutateAsync({ appointmentId: reschedule.id, newSlotId });
        }}
      />

      <DeleteAppointmentDialog
        appointment={deletionAppointment}
        open={deletion.open}
        onOpenChange={deletion.setOpen}
        onConfirm={async () => {
          if (!deletion.id) return;
          await deleteMutation.mutateAsync(deletion.id);
        }}
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
