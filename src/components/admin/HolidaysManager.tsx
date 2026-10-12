// src/components/admin/HolidaysManager.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Trash2, Plus, CalendarPlus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { formatDate } from '@/lib/utils';
import { todayInBrussels } from '@/lib/date';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useValidationMessage } from '@/lib/useValidationMessage';
import type { Locale } from '@/lib/routing';
import {
  listHolidaysAction,
  createHolidayAction,
  deleteHolidayAction,
  importBelgianHolidaysAction,
  previewHolidayConflictsAction,
  type HolidayConflictDTO,
} from '@/app/actions/admin/holidays';
import {
  createHolidaySchema,
  type CreateHolidayFormValues,
  type CreateHolidayValues,
  type HolidayConflictResolutionValues,
} from '@/lib/validation/appointment';
import type { Service } from '@/types';
import { HolidayConflictsDialog } from './HolidayConflictsDialog';
import { usePermissions } from './PermissionsProvider';

/** Congé en attente de décision : saisi, mais pas encore créé car des rendez-vous sont touchés. */
type PendingHoliday = { holiday: CreateHolidayValues; conflicts: HolidayConflictDTO[] };

/**
 * Gestion des jours fériés et des congés (un jour ou une plage, éventuellement annuels).
 * Créer un congé sur des rendez-vous déjà pris ouvre un dialogue de décision avant toute écriture.
 */
export function HolidaysManager({ locale, services }: { locale: Locale; services: Service[] }) {
  const t = useTranslations('admin.holidays');
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const validationMessage = useValidationMessage();
  const { can } = usePermissions();
  const canCreate = can('holidays', 'create');
  const canDelete = can('holidays', 'delete');
  // Annuler des rendez-vous demande les droits sur les rendez-vous, en plus de celui de créer un congé.
  const canCancelAppointments = can('appointments', 'view') && can('appointments', 'edit');

  const [pending, setPending] = useState<PendingHoliday | null>(null);
  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [importYear, setImportYear] = useState(() => Number(todayInBrussels().slice(0, 4)));
  const thisYear = Number(todayInBrussels().slice(0, 4));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'holidays'] });

  const holidaysQuery = useQuery({
    queryKey: ['admin', 'holidays'],
    queryFn: async () => unwrapAction(await listHolidaysAction()).holidays,
  });

  const deleteMutation = useMutation({
    mutationFn: async (holidayId: string) => unwrapAction(await deleteHolidayAction({ holidayId })),
    onSuccess: refresh,
    onError: (error: Error) => toast.error(errorMessage(error)),
  });

  const importMutation = useMutation({
    mutationFn: async (year: number) => unwrapAction(await importBelgianHolidaysAction({ year, locale })),
    onSuccess: (result, year) => {
      refresh();
      if (result.created === 0) toast.info(t('importedNone', { year }));
      else toast.success(t('imported', { count: result.created }));
      // Les rendez-vous touchés restent en place : on le dit, pour que l'admin les replanifie.
      if (result.ignoredConflicts > 0) toast.warning(t('importedWithConflicts', { count: result.ignoredConflicts }));
    },
    onError: (error: Error) => toast.error(errorMessage(error)),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateHolidayFormValues>({
    resolver: zodResolver(createHolidaySchema),
    defaultValues: { isRecurring: false },
  });

  /** Crée le congé ; rejette en cas d'échec pour que la modale de conflits reste ouverte. */
  const createMutation = useMutation({
    mutationFn: async (input: { holiday: CreateHolidayValues; resolution?: HolidayConflictResolutionValues }) =>
      unwrapAction(await createHolidayAction(input)),
    onSuccess: (result) => {
      refresh();
      if (result.cancelledCount > 0) {
        // Les rendez-vous annulés ont changé de statut : la liste des rendez-vous doit se rafraîchir aussi.
        queryClient.invalidateQueries({ queryKey: ['admin', 'appointments'] });
        toast.success(
          result.failedCount > 0
            ? t('addedCancelledPartial', { cancelled: result.cancelledCount, failed: result.failedCount })
            : t('addedCancelled', { cancelled: result.cancelledCount }),
        );
      } else {
        toast.success(t('added'));
      }
      reset({ date: '', endDate: undefined, label: '', isRecurring: false });
    },
    onError: (error: Error) => toast.error(errorMessage(error)),
  });

  /** Aperçu des conflits d'abord : le congé n'est écrit qu'une fois la décision prise, s'il y en a une à prendre. */
  async function onSubmit(values: CreateHolidayFormValues) {
    const holiday = values as CreateHolidayValues;
    const preview = await previewHolidayConflictsAction(holiday);
    if (!preview.success) {
      toast.error(errorMessage(preview.error));
      return;
    }
    if (preview.conflicts.length > 0) {
      setPending({ holiday, conflicts: preview.conflicts });
      setConflictsOpen(true);
      return;
    }
    await createMutation.mutateAsync({ holiday }).catch(() => undefined);
  }

  const holidays = holidaysQuery.data ?? [];

  return (
    <div className="space-y-4">
      {canCreate && (
        <>
          <Card className="p-4">
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{t('date')}</span>
                <input
                  type="date"
                  {...register('date')}
                  className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium">{t('endDate')}</span>
                {/* Un champ vide veut dire « un seul jour » : il est envoyé absent, pas comme une chaîne vide. */}
                <input
                  type="date"
                  {...register('endDate', { setValueAs: (value: string) => value || undefined })}
                  className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm flex-1 min-w-[200px]">
                <span className="font-medium">{t('label')}</span>
                <input
                  type="text"
                  {...register('label')}
                  placeholder={t('label')}
                  className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
                />
              </label>

              <label className="flex items-center gap-2 text-sm pb-2">
                <input type="checkbox" {...register('isRecurring')} className="w-4 h-4" />
                {t('recurring')}
              </label>

              <Button type="submit" isLoading={isSubmitting}>
                <Plus size={16} />
                {t('add')}
              </Button>

              {Object.values(errors).length > 0 && (
                <p className="w-full text-xs text-[var(--color-secondary)]">
                  {validationMessage(Object.values(errors)[0]?.message)}
                </p>
              )}
            </form>
          </Card>

          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <p className="text-sm font-medium">{t('importTitle')}</p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">{t('importDescription')}</p>
              </div>
              <Select label={t('importYear')} value={String(importYear)} onChange={(event) => setImportYear(Number(event.target.value))}>
                {[thisYear, thisYear + 1].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </Select>
              <Button variant="outline" isLoading={importMutation.isPending} onClick={() => importMutation.mutate(importYear)}>
                <CalendarPlus size={16} />
                {t('importSubmit')}
              </Button>
            </div>
          </Card>
        </>
      )}

      <Card className="divide-y divide-[var(--color-border)]">
        {holidaysQuery.isLoading ? (
          <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('title')}…</p>
        ) : holidays.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('empty')}</p>
        ) : (
          holidays.map((holiday) => (
            <div key={holiday.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{holiday.label}</p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5 flex flex-wrap items-center gap-2">
                  {holiday.endDate === holiday.date
                    ? formatDate(holiday.date, locale)
                    : t('range', { from: formatDate(holiday.date, locale), to: formatDate(holiday.endDate, locale) })}
                  {holiday.isRecurring && <Badge tone="info">{t('recurring')}</Badge>}
                </p>
              </div>
              {canDelete && (
                <button
                  onClick={() => {
                    if (window.confirm(t('confirmDelete'))) deleteMutation.mutate(holiday.id);
                  }}
                  title={t('delete')}
                  aria-label={t('delete')}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-secondary)]/10 hover:text-[var(--color-secondary)] transition-colors shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))
        )}
      </Card>

      <HolidayConflictsDialog
        open={conflictsOpen}
        onOpenChange={setConflictsOpen}
        conflicts={pending?.conflicts ?? []}
        services={services}
        locale={locale}
        canCancelAppointments={canCancelAppointments}
        onResolve={async (resolution) => {
          if (!pending) return;
          await createMutation.mutateAsync({ holiday: pending.holiday, resolution });
        }}
      />
    </div>
  );
}
