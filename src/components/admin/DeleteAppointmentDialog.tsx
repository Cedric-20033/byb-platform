// src/components/admin/DeleteAppointmentDialog.tsx
'use client';

import { useId, useState } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import type { AppointmentListItemDTO } from '@/app/actions/admin/appointments';
import { AdminDialog } from '@/components/admin/AdminDialog';

type DeleteAppointmentDialogProps = {
  /** Conservé par le parent après la fermeture : le contenu ne disparaît pas pendant l'animation de sortie. */
  appointment: AppointmentListItemDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Doit rejeter en cas d'échec pour garder la modale ouverte. */
  onConfirm: () => Promise<void>;
};

/** Normalisation de la comparaison : casse et espaces de bord ne doivent pas bloquer l'admin. */
const normalize = (value: string) => value.trim().toLocaleLowerCase();

/**
 * Confirmation forte d'une suppression définitive : l'admin doit saisir le nom du client. Un simple
 * bouton « Confirmer » se valide par réflexe ; recopier un nom oblige à regarder QUEL rendez-vous disparaît.
 */
export function DeleteAppointmentDialog({ appointment, open, onOpenChange, onConfirm }: DeleteAppointmentDialogProps) {
  const t = useTranslations('admin.appointments.delete');

  return (
    <AdminDialog open={open} onOpenChange={onOpenChange} title={t('title')} description={t('description')} closeLabel={t('close')}>
      {appointment && (
        <DeleteForm
          clientName={appointment.clientName}
          onConfirm={async () => {
            await onConfirm();
            onOpenChange(false);
          }}
        />
      )}
    </AdminDialog>
  );
}

/** Formulaire isolé : monté à chaque ouverture, la saisie repart toujours vide. */
function DeleteForm({ clientName, onConfirm }: { clientName: string; onConfirm: () => Promise<void> }) {
  const t = useTranslations('admin.appointments.delete');
  const inputId = useId();
  const [typed, setTyped] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirmed = normalize(typed) === normalize(clientName);

  async function submit() {
    setIsSubmitting(true);
    try {
      await onConfirm();
    } catch {
      // L'erreur est déjà affichée par l'appelant (toast).
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <label htmlFor={inputId} className="block text-sm">
        {t('confirmLabel', { name: clientName })}
      </label>
      <input
        id={inputId}
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        autoComplete="off"
        className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
      />

      <div className="flex justify-end gap-2 pt-2">
        <Dialog.Close className="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]">
          {t('cancel')}
        </Dialog.Close>
        <button
          type="button"
          disabled={!confirmed || isSubmitting}
          onClick={submit}
          className="px-4 py-2 text-sm font-semibold rounded-[var(--radius-md)] bg-[var(--color-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('submit')}
        </button>
      </div>
    </div>
  );
}
