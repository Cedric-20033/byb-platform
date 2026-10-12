// src/components/admin/SlotsBulkPanel.tsx
'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@base-ui/react/dialog';
import { ListChecks } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { blockSlotsInRangeAction, deleteAvailableSlotsAction } from '@/app/actions/admin/slots';
import { AdminDialog } from '@/components/admin/AdminDialog';
import { usePermissions } from '@/components/admin/PermissionsProvider';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateInput } from '@/components/ui/DateInput';
import { Select } from '@/components/ui/Select';
import { todayInBrussels } from '@/lib/date';
import type { Locale } from '@/lib/routing';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { formatDate, t as translateField } from '@/lib/utils';
import type { Service } from '@/types';

type BulkOperation = 'block' | 'delete';

/**
 * Opérations de masse sur les créneaux libres d'une période : tout bloquer (congé, déplacement) ou tout supprimer
 * (mauvaise génération). Chaque bouton n'apparaît qu'avec son droit (`slots.edit`, `slots.delete`), et une
 * confirmation décrit exactement le périmètre avant d'agir : ces actions touchent des dizaines de lignes.
 */
export function SlotsBulkPanel({ locale, services }: { locale: Locale; services: Service[] }) {
  const t = useTranslations('admin.slots.bulk');
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();
  const { can } = usePermissions();
  const canBlock = can('slots', 'edit');
  const canDelete = can('slots', 'delete');

  const [expanded, setExpanded] = useState(false);
  const [from, setFrom] = useState(() => todayInBrussels());
  const [to, setTo] = useState(() => todayInBrussels());
  const [serviceId, setServiceId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [pending, setPending] = useState<BulkOperation | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'slots'] });

  const blockMutation = useMutation({
    mutationFn: async () =>
      unwrapAction(
        await blockSlotsInRangeAction({
          from,
          to,
          serviceId: serviceId || undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
        }),
      ),
    onSuccess: (result) => {
      refresh();
      if (result.blocked === 0) toast.info(t('nothing'));
      else if (result.skippedBooked > 0) toast.success(t('blockedWithSkipped', { count: result.blocked, skipped: result.skippedBooked }));
      else toast.success(t('blocked', { count: result.blocked }));
    },
    onError: (error: Error) => toast.error(errorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: async () =>
      unwrapAction(await deleteAvailableSlotsAction({ from, to, serviceId: serviceId || undefined })),
    onSuccess: (result) => {
      refresh();
      toast[result.deleted === 0 ? 'info' : 'success'](result.deleted === 0 ? t('nothing') : t('deleted', { count: result.deleted }));
    },
    onError: (error: Error) => toast.error(errorMessage(error)),
  });

  if (!canBlock && !canDelete) return null;

  const windowValid = (!startTime && !endTime) || Boolean(startTime && endTime && startTime < endTime);
  const valid = Boolean(from && to && from <= to) && windowValid;
  const service = services.find((candidate) => candidate.id === serviceId);
  const scopeLabel = service ? translateField(service.name, locale) : t('allServices');
  const mutation = pending === 'delete' ? deleteMutation : blockMutation;

  async function confirm() {
    if (!pending) return;
    try {
      await (pending === 'delete' ? deleteMutation : blockMutation).mutateAsync();
    } catch {
      // L'erreur est déjà affichée en toast ; la confirmation se ferme, le formulaire garde ses valeurs.
    }
    setPending(null);
  }

  return (
    <Card className="p-4 space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex items-center gap-2 text-sm font-semibold"
      >
        <ListChecks size={16} aria-hidden="true" />
        {t('toggle')}
      </button>

      {expanded && (
        <>
          <p className="text-xs text-[var(--color-muted)]">{t('description')}</p>

          <div className="flex flex-wrap items-end gap-3">
            <Select label={t('service')} value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
              <option value="">{t('allServices')}</option>
              {services.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {translateField(candidate.name, locale)}
                </option>
              ))}
            </Select>
            <DateInput label={t('from')} value={from} onChange={(event) => setFrom(event.target.value)} />
            <DateInput label={t('to')} value={to} onChange={(event) => setTo(event.target.value)} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{t('windowStart')}</span>
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{t('windowEnd')}</span>
              <input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
              />
            </label>
          </div>
          <p className="text-xs text-[var(--color-muted)]">{t('windowHint')}</p>

          <div className="flex flex-wrap gap-2">
            {canBlock && (
              <Button variant="outline" size="sm" disabled={!valid} onClick={() => setPending('block')}>
                {t('block')}
              </Button>
            )}
            {canDelete && (
              <Button variant="outline" size="sm" disabled={!valid || Boolean(startTime || endTime)} onClick={() => setPending('delete')}>
                {t('delete')}
              </Button>
            )}
          </div>
        </>
      )}

      <AdminDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending === 'delete' ? t('confirmDeleteTitle') : t('confirmBlockTitle')}
        description={t(pending === 'delete' ? 'confirmDelete' : 'confirmBlock', {
          from: formatDate(from, locale),
          to: formatDate(to, locale),
          service: scopeLabel,
        })}
        closeLabel={t('close')}
      >
        <div className="flex justify-end gap-2 pt-2">
          <Dialog.Close className="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]">
            {t('cancel')}
          </Dialog.Close>
          <Button isLoading={mutation.isPending} onClick={confirm}>
            {pending === 'delete' ? t('confirmDeleteButton') : t('confirmBlockButton')}
          </Button>
        </div>
      </AdminDialog>
    </Card>
  );
}
