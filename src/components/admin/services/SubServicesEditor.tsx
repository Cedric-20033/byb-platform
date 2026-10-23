// src/components/admin/services/SubServicesEditor.tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import {
  createSubServiceAction,
  deleteSubServiceAction,
  reorderSubServicesAction,
  updateSubServiceAction,
} from '@/app/actions/admin/services';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { CatalogService, CatalogSubService } from '@/domain/service/CatalogService';
import { unwrapAction } from '@/lib/unwrapAction';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { useValidationMessage } from '@/lib/useValidationMessage';
import { subServiceFormSchema, type SubServiceFormValues } from '@/lib/validation/services';
import { ConfirmDialog } from '../ConfirmDialog';
import { SortableList } from '../SortableList';
import { usePermissions } from '../PermissionsProvider';
import { useInvalidateCatalog } from './catalogQuery';
import { TRANSLATION_LOCALES } from './translationCompleteness';

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]';

const EMPTY_VALUES: SubServiceFormValues = {
  name: { fr: '', en: '', de: '' },
  description: { fr: '', en: '', de: '' },
};

function toFormValues(sub: CatalogSubService): SubServiceFormValues {
  return {
    name: { fr: sub.name.fr, en: sub.name.en ?? '', de: sub.name.de ?? '' },
    description: { fr: sub.description.fr, en: sub.description.en ?? '', de: sub.description.de ?? '' },
  };
}

/** `null` = formulaire fermé ; `'new'` = création ; sinon la sous-prestation en cours d'édition. */
type EditorState = null | 'new' | CatalogSubService;

export function SubServicesEditor({ service }: { service: CatalogService }) {
  const t = useTranslations('admin.catalog.subServices');
  const tToast = useTranslations('admin.catalog.toast');
  const tConfirm = useTranslations('admin.catalog.confirm');
  const tForm = useTranslations('admin.catalog.form');
  const errorMessage = useErrorMessage();
  const validationMessage = useValidationMessage();
  const invalidateCatalog = useInvalidateCatalog();
  const { can } = usePermissions();

  const [editor, setEditor] = useState<EditorState>(null);
  const [toDelete, setToDelete] = useState<CatalogSubService | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canCreate = can('services', 'create');
  const canEdit = can('services', 'edit');
  const canDelete = can('services', 'delete');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubServiceFormValues>({
    resolver: zodResolver(subServiceFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  function open(state: Exclude<EditorState, null>) {
    reset(state === 'new' ? EMPTY_VALUES : toFormValues(state));
    setEditor(state);
  }

  async function onSubmit(values: SubServiceFormValues) {
    try {
      if (editor && editor !== 'new') {
        unwrapAction(await updateSubServiceAction({ subServiceId: editor.id, ...values }));
      } else {
        unwrapAction(await createSubServiceAction({ serviceId: service.id, ...values }));
      }
      toast.success(tToast('subServiceSaved'));
      setEditor(null);
      await invalidateCatalog();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function onReorder(ordered: CatalogSubService[]) {
    try {
      unwrapAction(
        await reorderSubServicesAction({ serviceId: service.id, orderedIds: ordered.map((sub) => sub.id) }),
      );
      await invalidateCatalog();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setIsDeleting(true);
    try {
      unwrapAction(await deleteSubServiceAction({ subServiceId: toDelete.id }));
      toast.success(tToast('subServiceDeleted'));
      setToDelete(null);
      await invalidateCatalog();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-[var(--font-display)] font-bold">{t('title')}</h2>
        {canCreate && editor === null && (
          <Button size="sm" variant="outline" onClick={() => open('new')}>
            <Plus size={14} />
            {t('add')}
          </Button>
        )}
      </div>

      {service.subServices.length === 0 && editor !== 'new' ? (
        <p className="text-sm text-[var(--color-muted)]">{t('empty')}</p>
      ) : (
        <SortableList
          items={service.subServices}
          getId={(sub) => sub.id}
          onReorder={onReorder}
          disabled={!canEdit}
          className="space-y-2"
          itemClassName="rounded-[var(--radius-md)] border border-[var(--color-border)] p-3"
          renderItem={(sub) => (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{sub.name.fr}</p>
                <p className="text-xs text-[var(--color-muted)] truncate">{sub.description.fr}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {canEdit && (
                  <button
                    type="button"
                    title={t('edit')}
                    aria-label={t('edit')}
                    onClick={() => open(sub)}
                    className="p-2 rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]"
                  >
                    <Pencil size={15} />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    title={t('delete')}
                    aria-label={t('delete')}
                    onClick={() => setToDelete(sub)}
                    className="p-2 rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-secondary)]/10 hover:text-[var(--color-secondary)]"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          )}
        />
      )}

      {editor !== null && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="rounded-[var(--radius-md)] border border-[var(--color-primary)]/40 p-4 space-y-4"
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {TRANSLATION_LOCALES.map((lang) => (
              <fieldset key={lang} className="space-y-2">
                <legend className="text-xs font-bold uppercase text-[var(--color-muted)]">
                  {tForm(`tabs.${lang}`)}
                  {lang === 'fr' && ` (${tForm('required')})`}
                </legend>
                <label className="block space-y-1">
                  <span className="text-xs font-medium">{t('name')}</span>
                  <input type="text" {...register(`name.${lang}`)} className={INPUT_CLASS} />
                  {errors.name?.[lang]?.message && (
                    <span className="text-xs text-[var(--color-secondary)]">
                      {validationMessage(errors.name[lang]?.message)}
                    </span>
                  )}
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium">{t('description')}</span>
                  <textarea rows={3} {...register(`description.${lang}`)} className={INPUT_CLASS} />
                  {errors.description?.[lang]?.message && (
                    <span className="text-xs text-[var(--color-secondary)]">
                      {validationMessage(errors.description[lang]?.message)}
                    </span>
                  )}
                </label>
              </fieldset>
            ))}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditor(null)}>
              {t('cancel')}
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              {t('save')}
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t('deleteTitle')}
        description={t('deleteDescription', { name: toDelete?.name.fr ?? '' })}
        confirmLabel={tConfirm('confirm')}
        cancelLabel={tConfirm('cancel')}
        onConfirm={confirmDelete}
        isSubmitting={isDeleting}
        destructive
      />
    </Card>
  );
}
