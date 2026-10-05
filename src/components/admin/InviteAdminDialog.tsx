// src/components/admin/InviteAdminDialog.tsx
'use client';

import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/auth/FormField';
import { USER_ROLES } from '@/lib/constants';
import { useValidationMessage } from '@/lib/useValidationMessage';
import { inviteAdminSchema, type InviteAdminValues } from '@/lib/validation/users';

type InviteAdminDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé avec des valeurs validées ; doit rejeter en cas d'échec pour garder la modale ouverte. */
  onSubmit: (values: InviteAdminValues) => Promise<void>;
};

/** Formulaire d'invitation d'un nouveau compte (admin ou superadmin). */
export function InviteAdminDialog({ open, onOpenChange, onSubmit }: InviteAdminDialogProps) {
  const t = useTranslations('admin.users');
  const validationMessage = useValidationMessage();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteAdminValues>({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: { email: '', fullName: '', role: USER_ROLES.ADMIN },
  });

  async function submit(values: InviteAdminValues) {
    try {
      await onSubmit(values);
      reset();
      onOpenChange(false);
    } catch {
      // L'erreur est déjà affichée par l'appelant (toast) ; on garde la saisie pour permettre une correction.
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Dialog.Popup className="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] p-6 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 data-[starting-style]:opacity-0 data-[starting-style]:scale-95 transition-all duration-200">
            <div className="flex items-center justify-between mb-2">
              <Dialog.Title className="text-lg font-[var(--font-display)] font-bold">{t('inviteDialog.title')}</Dialog.Title>
              <Dialog.Close aria-label={t('inviteDialog.close')} className="text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
                <X size={20} />
              </Dialog.Close>
            </div>
            <Dialog.Description className="text-sm text-[var(--color-muted)] mb-4">
              {t('inviteDialog.description')}
            </Dialog.Description>

            <form onSubmit={handleSubmit(submit)} noValidate className="space-y-4">
              <FormField
                label={t('inviteDialog.fullName')}
                autoComplete="off"
                error={validationMessage(errors.fullName?.message)}
                {...register('fullName')}
              />
              <FormField
                label={t('inviteDialog.email')}
                type="email"
                autoComplete="off"
                error={validationMessage(errors.email?.message)}
                {...register('email')}
              />

              <label className="block text-sm">
                <span className="font-medium block mb-1">{t('inviteDialog.role')}</span>
                <select
                  {...register('role')}
                  className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]"
                >
                  <option value={USER_ROLES.ADMIN}>{t('roles.admin')}</option>
                  <option value={USER_ROLES.SUPERADMIN}>{t('roles.superadmin')}</option>
                </select>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <Dialog.Close className="px-4 py-2 text-sm font-medium rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]">
                  {t('cancel')}
                </Dialog.Close>
                <Button type="submit" isLoading={isSubmitting}>
                  {t('inviteDialog.submit')}
                </Button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
