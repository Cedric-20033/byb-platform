// src/components/admin/EditAppointmentDialog.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import type { AppointmentListItemDTO } from '@/app/actions/admin/appointments';
import { AdminDialog } from '@/components/admin/AdminDialog';
import { FormField } from '@/components/auth/FormField';
import { Button } from '@/components/ui/Button';
import { useValidationMessage } from '@/lib/useValidationMessage';
import { appointmentClientSchema, type AppointmentClientValues } from '@/lib/validation/appointment';

type EditAppointmentDialogProps = {
  /** Conservé par le parent après la fermeture : le contenu ne disparaît pas pendant l'animation de sortie. */
  appointment: AppointmentListItemDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Doit rejeter en cas d'échec pour garder la modale ouverte avec la saisie. */
  onSubmit: (values: AppointmentClientValues) => Promise<void>;
};

/** Correction des coordonnées et des notes d'un rendez-vous (mêmes règles que la réservation publique). */
export function EditAppointmentDialog({ appointment, open, onOpenChange, onSubmit }: EditAppointmentDialogProps) {
  const t = useTranslations('admin.appointments.edit');

  return (
    <AdminDialog open={open} onOpenChange={onOpenChange} title={t('title')} description={t('description')} closeLabel={t('close')}>
      {appointment && (
        <EditForm
          appointment={appointment}
          onSubmit={async (values) => {
            await onSubmit(values);
            onOpenChange(false);
          }}
        />
      )}
    </AdminDialog>
  );
}

/** Formulaire isolé : monté à chaque ouverture, il repart des valeurs actuelles du rendez-vous. */
function EditForm({
  appointment,
  onSubmit,
}: {
  appointment: AppointmentListItemDTO;
  onSubmit: (values: AppointmentClientValues) => Promise<void>;
}) {
  const t = useTranslations('admin.appointments');
  const validationMessage = useValidationMessage();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentClientValues>({
    resolver: zodResolver(appointmentClientSchema),
    defaultValues: {
      clientName: appointment.clientName,
      clientEmail: appointment.clientEmail,
      clientPhone: appointment.clientPhone,
      notes: appointment.notes ?? '',
    },
  });

  async function submit(values: AppointmentClientValues) {
    try {
      await onSubmit(values);
    } catch {
      // L'erreur est déjà affichée par l'appelant (toast) ; la saisie est conservée pour correction.
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="space-y-3">
      <FormField label={t('create.name')} autoComplete="off" error={validationMessage(errors.clientName?.message)} {...register('clientName')} />
      <FormField
        label={t('create.email')}
        type="email"
        autoComplete="off"
        error={validationMessage(errors.clientEmail?.message)}
        {...register('clientEmail')}
      />
      <FormField
        label={t('create.phone')}
        type="tel"
        autoComplete="off"
        error={validationMessage(errors.clientPhone?.message)}
        {...register('clientPhone')}
      />
      <label className="block text-sm">
        <span className="font-medium block mb-1">{t('create.notes')}</span>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
        />
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Dialog.Close className="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]">
          {t('edit.cancel')}
        </Dialog.Close>
        <Button type="submit" isLoading={isSubmitting}>
          {t('edit.submit')}
        </Button>
      </div>
    </form>
  );
}
