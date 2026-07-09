// src/components/admin/SlotsManager.tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Lock, Unlock, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { DateInput } from '@/components/ui/DateInput';
import { Button } from '@/components/ui/Button';
import { getActiveServices, getServiceById } from '@/data/services';
import { t as translateField } from '@/lib/utils';
import type { Locale } from '@/lib/routing';
import { SlotStatus } from '@/domain/slot/Slot';
import { listSlotsByDateAction, blockSlotAction, unblockSlotAction, generateSlotsAction } from '@/app/actions/admin/slots';
import { generateAvailableSlotsSchema, type GenerateAvailableSlotsValues } from '@/lib/validation/appointment';

const services = getActiveServices();

const STATUS_TONE = {
  [SlotStatus.AVAILABLE]: 'success',
  [SlotStatus.BOOKED]: 'info',
  [SlotStatus.BLOCKED]: 'danger',
} as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Composant pour gérer les créneaux horaires.
 * @param param0 
 * @returns 
 */
export function SlotsManager({ locale }: { locale: Locale }) {
  const t = useTranslations('admin.slots');
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayIso());
  const [serviceId, setServiceId] = useState(services[0]?.id ?? '');
  const [showGenerateForm, setShowGenerateForm] = useState(false);

  /**
   * Récupère la liste des créneaux horaires en fonction de la date et du service sélectionnés.
   * Utilise React Query pour gérer l'état de chargement et les erreurs.
   * 
   * @returns
   */
  const slotsQuery = useQuery({
    queryKey: ['admin', 'slots', date, serviceId],
    queryFn: async () => {
      const result = await listSlotsByDateAction({ date, serviceId: serviceId || undefined });
      if (!result.success) throw new Error(result.error);
      return result.slots;
    },
  });

  /**
   * Mutation pour bloquer ou débloquer un créneau horaire.
   * Utilise React Query pour gérer l'état de la mutation et les erreurs.
   * 
   * @returns
   */
  const toggleMutation = useMutation({
    mutationFn: async (input: { slotId: string; nextStatus: SlotStatus }) => {
      const action = input.nextStatus === SlotStatus.BLOCKED ? blockSlotAction : unblockSlotAction;
      const result = await action({ slotId: input.slotId });
      if (!result.success) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'slots'] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Select label={t('selectService')} value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="min-w-[200px]">
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {translateField(service.name, locale)}
            </option>
          ))}
        </Select>
        <DateInput label={t('selectDate')} value={date} onChange={(e) => setDate(e.target.value)} />

        <Button variant="outline" size="sm" onClick={() => setShowGenerateForm((v) => !v)} className="normal-case font-medium tracking-normal ml-auto">
          <Wand2 size={16} />
          {t('generateTitle')}
        </Button>
      </div>

      {showGenerateForm && (
        <GenerateSlotsForm
          locale={locale}
          defaultServiceId={serviceId}
          onGenerated={() => {
            setShowGenerateForm(false);
            queryClient.invalidateQueries({ queryKey: ['admin', 'slots'] });
          }}
        />
      )}

      <Card className="p-4">
        {slotsQuery.isLoading ? (
          <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('title')}…</p>
        ) : !slotsQuery.data || slotsQuery.data.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('noSlots')}</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {slotsQuery.data.map((slot) => (
              <li
                key={slot.id}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)]"
              >
                <div>
                  <p className="text-sm font-medium">
                    {slot.startTime.slice(0, 5)}–{slot.endTime.slice(0, 5)}
                  </p>
                  <Badge tone={STATUS_TONE[slot.status]} className="mt-1">
                    {slot.status}
                  </Badge>
                </div>
                {slot.status !== SlotStatus.BOOKED && (
                  <button
                    onClick={() =>
                      toggleMutation.mutate({
                        slotId: slot.id,
                        nextStatus: slot.status === SlotStatus.AVAILABLE ? SlotStatus.BLOCKED : SlotStatus.AVAILABLE,
                      })
                    }
                    title={slot.status === SlotStatus.AVAILABLE ? t('block') : t('unblock')}
                    className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-foreground)] transition-colors shrink-0"
                  >
                    {slot.status === SlotStatus.AVAILABLE ? <Lock size={15} /> : <Unlock size={15} />}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/**
 * Composant pour le formulaire de génération de créneaux horaires.
 * @param param0 
 * @returns 
 */
function GenerateSlotsForm({
  locale,
  defaultServiceId,
  onGenerated,
}: {
  locale: Locale;
  defaultServiceId: string;
  onGenerated: () => void;
}) {
  const t = useTranslations('admin.slots');
  const service = getServiceById(defaultServiceId);

  /**
   * Initialise le formulaire de génération de créneaux horaires avec React Hook Form et Zod pour la validation.
   */
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GenerateAvailableSlotsValues>({
    resolver: zodResolver(generateAvailableSlotsSchema),
    defaultValues: {
      serviceId: defaultServiceId,
      dailyStartTime: '08:00',
      dailyEndTime: '18:00',
      slotDurationMinutes: 60,
    },
  });

  /**
   * Soumet le formulaire de génération de créneaux horaires.
   * @param values 
   * @returns 
   */
  async function onSubmit(values: GenerateAvailableSlotsValues) {
    const result = await generateSlotsAction(values);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.created} créneaux générés.`);
    onGenerated();
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
        <input type="hidden" {...register('serviceId')} />
        <div className="flex flex-col gap-1 text-sm col-span-2 sm:col-span-1">
          <span className="font-medium">{t('selectService')}</span>
          <span className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] text-[var(--color-muted)]">
            {service ? translateField(service.name, locale) : defaultServiceId}
          </span>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t('generateFrom')}</span>
          <input type="date" {...register('from')} className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t('generateTo')}</span>
          <input type="date" {...register('to')} className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t('dailyStart')}</span>
          <input type="time" {...register('dailyStartTime')} className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t('dailyEnd')}</span>
          <input type="time" {...register('dailyEndTime')} className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t('duration')}</span>
          <input
            type="number"
            step={15}
            {...register('slotDurationMinutes', { valueAsNumber: true })}
            className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
          />
        </label>
        <Button type="submit" isLoading={isSubmitting} className="h-fit">
          {isSubmitting ? t('generating') : t('generateSubmit')}
        </Button>

        {Object.values(errors).length > 0 && (
          <p className="col-span-full text-xs text-[var(--color-secondary)]">
            {Object.values(errors)[0]?.message as string}
          </p>
        )}
      </form>
    </Card>
  );
}
