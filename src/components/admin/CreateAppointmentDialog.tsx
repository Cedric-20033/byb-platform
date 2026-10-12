// src/components/admin/CreateAppointmentDialog.tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { FormField } from '@/components/auth/FormField';
import { usePermissions } from '@/components/admin/PermissionsProvider';
import { SlotPicker } from '@/components/admin/SlotPicker';
import { Button } from '@/components/ui/Button';
import { DateInput } from '@/components/ui/DateInput';
import { Select } from '@/components/ui/Select';
import { toIsoDate } from '@/domain/shared/IsoDate';
import type { Locale } from '@/lib/routing';
import { t as translateField } from '@/lib/utils';
import { useValidationMessage } from '@/lib/useValidationMessage';
import {
  appointmentClientSchema,
  type AppointmentClientValues,
  type CreateAppointmentByAdminValues,
} from '@/lib/validation/appointment';
import type { Service } from '@/types';

type SlotMode = 'existing' | 'adHoc';
type SlotSelectionValues = CreateAppointmentByAdminValues['slot'];

type CreateAppointmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  locale: Locale;
  /** Appelé avec des valeurs complètes ; doit rejeter en cas d'échec pour garder la modale ouverte. */
  onSubmit: (values: CreateAppointmentByAdminValues) => Promise<void>;
};

const CLIENT_DEFAULTS: AppointmentClientValues = { clientName: '', clientEmail: '', clientPhone: '', notes: '' };

/**
 * Création manuelle d'un rendez-vous (appel téléphonique, passage sur place).
 *
 * Le choix du service et du créneau vit dans l'état du composant (il dépend de requêtes et
 * pilote l'affichage), les coordonnées du client dans react-hook-form avec les mêmes règles que le
 * formulaire public. Le serveur revalide l'ensemble : ce composant n'est qu'un confort de saisie.
 */
export function CreateAppointmentDialog({ open, onOpenChange, services, locale, onSubmit }: CreateAppointmentDialogProps) {
  const t = useTranslations('admin.appointments.create');
  const validationMessage = useValidationMessage();
  const { can } = usePermissions();
  // Un créneau ponctuel crée un créneau : sans `slots.create`, seule la réservation d'un créneau libre est proposée.
  const canCreateAdHoc = can('slots', 'create');

  const [serviceId, setServiceId] = useState('');
  const [subServiceId, setSubServiceId] = useState('');
  const [mode, setMode] = useState<SlotMode>('existing');
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const [slotId, setSlotId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentClientValues>({
    resolver: zodResolver(appointmentClientSchema),
    defaultValues: CLIENT_DEFAULTS,
  });

  // Seuls les services actifs sont réservables, même manuellement (la fonction SQL le refuse aussi).
  const bookableServices = services.filter((service) => service.isActive);
  const selectedService = bookableServices.find((service) => service.id === serviceId) ?? null;
  const today = toIsoDate(new Date());

  /** null tant que la sélection est incomplète : le bouton reste inactif. */
  const slot: SlotSelectionValues | null =
    mode === 'existing'
      ? slotId
        ? { kind: 'existing', slotId }
        : null
      : date && startTime && endTime && startTime < endTime
        ? { kind: 'adHoc', date, startTime, endTime }
        : null;

  function resetAll() {
    setServiceId('');
    setSubServiceId('');
    setMode('existing');
    setDate(toIsoDate(new Date()));
    setSlotId('');
    setStartTime('');
    setEndTime('');
    reset(CLIENT_DEFAULTS);
  }

  async function submit(client: AppointmentClientValues) {
    if (!serviceId || !slot) return;
    try {
      await onSubmit({ ...client, serviceId, subServiceId: subServiceId || undefined, slot });
      resetAll();
      onOpenChange(false);
    } catch {
      // L'erreur est déjà affichée par l'appelant (toast) ; on garde la saisie pour permettre une correction.
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) resetAll();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] p-6 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <Dialog.Title className="text-lg font-[var(--font-display)] font-bold">{t('title')}</Dialog.Title>
              <Dialog.Close aria-label={t('close')} className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-[var(--color-muted)] mb-4">{t('description')}</Dialog.Description>

            <form onSubmit={handleSubmit(submit)} noValidate className="space-y-5">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t('serviceSection')}</h3>
                <Select
                  label={t('service')}
                  value={serviceId}
                  onChange={(event) => {
                    setServiceId(event.target.value);
                    // Sous-prestation et créneau dépendent du service : les garder produirait un choix incohérent.
                    setSubServiceId('');
                    setSlotId('');
                  }}
                >
                  <option value="">{t('servicePlaceholder')}</option>
                  {bookableServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {translateField(service.name, locale)}
                    </option>
                  ))}
                </Select>

                {selectedService && selectedService.subServices.length > 0 && (
                  <Select label={t('subService')} value={subServiceId} onChange={(event) => setSubServiceId(event.target.value)}>
                    <option value="">{t('noSubService')}</option>
                    {selectedService.subServices.map((subService) => (
                      <option key={subService.id} value={subService.id}>
                        {translateField(subService.name, locale)}
                      </option>
                    ))}
                  </Select>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t('slotSection')}</h3>

                {canCreateAdHoc && (
                  <fieldset className="flex flex-wrap gap-4 text-sm">
                    <legend className="sr-only">{t('modeLabel')}</legend>
                    {(['existing', 'adHoc'] as const).map((option) => (
                      <label key={option} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="slot-mode"
                          value={option}
                          checked={mode === option}
                          onChange={() => setMode(option)}
                        />
                        {option === 'existing' ? t('modeExisting') : t('modeAdHoc')}
                      </label>
                    ))}
                  </fieldset>
                )}

                <DateInput
                  label={t('date')}
                  value={date}
                  min={today}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setSlotId('');
                  }}
                />

                {mode === 'existing' ? (
                  serviceId ? (
                    <SlotPicker serviceId={serviceId} date={date} value={slotId} onChange={setSlotId} />
                  ) : (
                    <p className="text-sm text-[var(--color-muted)]">{t('pickService')}</p>
                  )
                ) : (
                  <>
                    <p className="text-xs text-[var(--color-muted)]">{t('adHocHint')}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        label={t('startTime')}
                        type="time"
                        value={startTime}
                        onChange={(event) => setStartTime(event.target.value)}
                      />
                      <FormField
                        label={t('endTime')}
                        type="time"
                        value={endTime}
                        onChange={(event) => setEndTime(event.target.value)}
                      />
                    </div>
                  </>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">{t('clientSection')}</h3>
                <FormField
                  label={t('name')}
                  autoComplete="off"
                  error={validationMessage(errors.clientName?.message)}
                  {...register('clientName')}
                />
                <FormField
                  label={t('email')}
                  type="email"
                  autoComplete="off"
                  error={validationMessage(errors.clientEmail?.message)}
                  {...register('clientEmail')}
                />
                <FormField
                  label={t('phone')}
                  type="tel"
                  autoComplete="off"
                  error={validationMessage(errors.clientPhone?.message)}
                  {...register('clientPhone')}
                />
                <label className="block text-sm">
                  <span className="font-medium block mb-1">{t('notes')}</span>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
                  />
                </label>
              </section>

              <div className="flex justify-end gap-2 pt-1">
                <Dialog.Close className="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]">
                  {t('cancel')}
                </Dialog.Close>
                <Button type="submit" isLoading={isSubmitting} disabled={!serviceId || !slot}>
                  {t('submit')}
                </Button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
