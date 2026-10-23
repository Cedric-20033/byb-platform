// src/components/admin/RescheduleAppointmentDialog.tsx
'use client';

import { useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import type { AppointmentListItemDTO } from '@/app/actions/admin/appointments';
import { AdminDialog } from '@/components/admin/AdminDialog';
import { SlotPicker } from '@/components/admin/SlotPicker';
import { Button } from '@/components/ui/Button';
import { DateInput } from '@/components/ui/DateInput';
import { toIsoDate } from '@/domain/shared/IsoDate';
import type { Locale } from '@/lib/routing';
import { formatDate } from '@/lib/utils';

type RescheduleAppointmentDialogProps = {
  /** Conservé par le parent après la fermeture : le contenu ne disparaît pas pendant l'animation de sortie. */
  appointment: AppointmentListItemDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
  /** Doit rejeter en cas d'échec pour garder la modale ouverte. */
  onSubmit: (newSlotId: string) => Promise<void>;
};

/** Déplacement d'un rendez-vous vers un autre créneau libre du même service ; le client est prévenu. */
export function RescheduleAppointmentDialog({ appointment, open, onOpenChange, locale, onSubmit }: RescheduleAppointmentDialogProps) {
  const t = useTranslations('admin.appointments.reschedule');

  return (
    <AdminDialog open={open} onOpenChange={onOpenChange} title={t('title')} description={t('description')} closeLabel={t('close')}>
      {appointment && (
        <RescheduleForm
          appointment={appointment}
          locale={locale}
          onSubmit={async (slotId) => {
            await onSubmit(slotId);
            onOpenChange(false);
          }}
        />
      )}
    </AdminDialog>
  );
}

/** Formulaire isolé : monté à chaque ouverture, il repart de la date du rendez-vous. */
function RescheduleForm({
  appointment,
  locale,
  onSubmit,
}: {
  appointment: AppointmentListItemDTO;
  locale: Locale;
  onSubmit: (newSlotId: string) => Promise<void>;
}) {
  const t = useTranslations('admin.appointments.reschedule');
  const today = toIsoDate(new Date());
  // On propose d'abord le jour du rendez-vous (cas courant : changer d'heure) ; s'il est passé, aujourd'hui.
  const [date, setDate] = useState(appointment.slotDate >= today ? appointment.slotDate : today);
  const [slotId, setSlotId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit() {
    setIsSubmitting(true);
    try {
      await onSubmit(slotId);
    } catch {
      // L'erreur est déjà affichée par l'appelant (toast) ; on garde la sélection pour en choisir une autre.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm">
        <span className="text-[var(--color-muted)]">{t('current')} : </span>
        {formatDate(appointment.slotDate, locale)} · {appointment.slotStartTime.slice(0, 5)} - {appointment.slotEndTime.slice(0, 5)}
      </p>

      <DateInput
        label={t('date')}
        value={date}
        min={today}
        onChange={(event) => {
          setDate(event.target.value);
          setSlotId('');
        }}
      />

      <SlotPicker serviceId={appointment.serviceId} date={date} value={slotId} onChange={setSlotId} />

      <div className="flex justify-end gap-2 pt-2">
        <Dialog.Close className="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]">
          {t('cancel')}
        </Dialog.Close>
        <Button isLoading={isSubmitting} disabled={!slotId} onClick={submit}>
          {t('submit')}
        </Button>
      </div>
    </div>
  );
}
