// src/components/admin/HolidaysManager.tsx
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatDate } from '@/lib/utils';
import {
  listHolidaysAction,
  createHolidayAction,
  deleteHolidayAction,
} from '@/app/actions/admin/holidays';
import {
  createHolidaySchema,
  type CreateHolidayValues,
  type CreateHolidayFormValues,
} from '@/lib/validation/appointment';

/**
 * Composant pour gérer les jours fériés.
 * @returns 
 */
export function HolidaysManager() {
  const t = useTranslations('admin.holidays');
  const locale = useLocale();
  const queryClient = useQueryClient();

  /**
   * Récupère la liste des jours fériés.
   * Utilise React Query pour gérer l'état de chargement et les erreurs.
   * 
   * @returns
   */
  const holidaysQuery = useQuery({
    queryKey: ['admin', 'holidays'],
    queryFn: async () => {
      const result = await listHolidaysAction();
      if (!result.success) throw new Error(result.error);
      return result.holidays;
    },
  });

  /**
   * Mutation pour supprimer un jour férié.
   * Utilise React Query pour gérer l'état de la mutation et les erreurs.
   * 
   * @returns
   */
  const deleteMutation = useMutation({
    mutationFn: async (holidayId: string) => {
      const result = await deleteHolidayAction({ holidayId });
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'holidays'] }),
    onError: (error: Error) => toast.error(error.message),
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

  /**
   * Soumet le formulaire d'ajout de jour férié.
   * @param values 
   * @returns 
   */
  async function onSubmit(values: CreateHolidayFormValues) {
    const result = await createHolidayAction(values as CreateHolidayValues);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success('Jour férié ajouté.');
    reset({ date: '', label: '', isRecurring: false });
    queryClient.invalidateQueries({ queryKey: ['admin', 'holidays'] });
  }

  return (
    <div className="space-y-4">
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
              {Object.values(errors)[0]?.message as string}
            </p>
          )}
        </form>
      </Card>

      <Card className="divide-y divide-[var(--color-border)]">
        {holidaysQuery.isLoading ? (
          <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('title')}…</p>
        ) : !holidaysQuery.data || holidaysQuery.data.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('empty')}</p>
        ) : (
          holidaysQuery.data.map((holiday) => (
            <div key={holiday.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{holiday.label}</p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5 flex items-center gap-2">
                  {formatDate(holiday.date, locale)}
                  {holiday.isRecurring && <Badge tone="info">{t('recurring')}</Badge>}
                </p>
              </div>
              <button
                onClick={() => {
                  if (window.confirm(t('confirmDelete'))) deleteMutation.mutate(holiday.id);
                }}
                title={t('delete')}
                className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-secondary)]/10 hover:text-[var(--color-secondary)] transition-colors shrink-0"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
