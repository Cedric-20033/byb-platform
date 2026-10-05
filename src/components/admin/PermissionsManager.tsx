// src/components/admin/PermissionsManager.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { PermissionsMatrix } from '@/components/admin/PermissionsMatrix';
import {
  PERMISSION_PRESET_IDS,
  buildPresetGrid,
  type PermissionAction,
  type PermissionDomain,
  type PermissionGrid,
  type PermissionPresetId,
} from '@/domain/user/PermissionCatalog';
import { diffPermissions } from '@/domain/user/PermissionDiff';
import { ActionError, type ActionFailure } from '@/lib/errors';
import { useErrorMessage } from '@/lib/useErrorMessage';
import {
  listAdminPermissionsAction,
  updateAdminPermissionsAction,
  type AdminPermissionsDTO,
} from '@/app/actions/admin/permissions';

const PERMISSIONS_QUERY_KEY = ['admin', 'permissions'];

function unwrap<T extends { success: true }>(result: T | ActionFailure): T {
  if (!result.success) throw new ActionError(result.error);
  return result;
}

export function PermissionsManager() {
  const t = useTranslations('admin.permissions');
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftState, setDraftState] = useState<{ adminId: string; permissions: PermissionGrid } | null>(null);
  /** Admin vers lequel l'utilisateur veut basculer alors que des modifications sont en attente. */
  const [pendingSwitchId, setPendingSwitchId] = useState<string | null>(null);

  const adminsQuery = useQuery({
    queryKey: PERMISSIONS_QUERY_KEY,
    queryFn: async () => unwrap(await listAdminPermissionsAction()).admins,
  });

  const admins = adminsQuery.data;
  const selected = useMemo(
    () => admins?.find((admin) => admin.id === selectedId) ?? admins?.[0] ?? null,
    [admins, selectedId],
  );
  const draft = selected
    ? draftState?.adminId === selected.id
      ? draftState.permissions
      : selected.permissions
    : null;

  function updateDraft(update: (current: PermissionGrid) => PermissionGrid) {
    if (!selected) return;
    setDraftState((current) => ({
      adminId: selected.id,
      permissions: update(current?.adminId === selected.id ? current.permissions : selected.permissions),
    }));
  }

  // Sélection initiale : premier admin de la liste.

  // Le brouillon repart de la grille enregistrée à chaque changement d'admin ou après un enregistrement.

  const changes = useMemo(
    () => (selected && draft ? diffPermissions(selected.permissions, draft) : []),
    [selected, draft],
  );
  const isDirty = changes.length > 0;

  // Avertit avant de quitter la page avec des modifications non enregistrées.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const saveMutation = useMutation({
    mutationFn: async (input: { adminId: string; permissions: PermissionGrid }) =>
      unwrap(await updateAdminPermissionsAction(input)).admin,
    onSuccess: (updated: AdminPermissionsDTO) => {
      // Mise à jour directe du cache : le brouillon se réaligne sans attendre un rechargement.
      queryClient.setQueryData<AdminPermissionsDTO[]>(PERMISSIONS_QUERY_KEY, (current) =>
        current?.map((admin) => (admin.id === updated.id ? updated : admin)),
      );
      toast.success(t('saved'));
    },
    onError: (error: Error) => toast.error(errorMessage(error)),
  });

  function toggle(domain: PermissionDomain, action: PermissionAction, allowed: boolean) {
    updateDraft((current) => ({ ...current, [domain]: { ...current[domain], [action]: allowed } }));
  }

  function applyPreset(preset: PermissionPresetId) {
    updateDraft(() => buildPresetGrid(preset));
  }

  function requestSwitch(adminId: string) {
    if (adminId === selected?.id) return;
    if (isDirty) setPendingSwitchId(adminId);
    else setSelectedId(adminId);
  }

  if (adminsQuery.isLoading) {
    return <p className="text-sm text-[var(--color-muted)]">{t('loading')}</p>;
  }

  if (!admins || admins.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-[var(--color-muted)]">
        <p>{t('noAdmins')}</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Card className="p-2 h-fit">
        <h2 className="px-2 py-1 text-xs font-semibold text-[var(--color-muted)]">{t('columnAdmin')}</h2>
        <ul>
          {admins.map((admin) => (
            <li key={admin.id}>
              <button
                type="button"
                onClick={() => requestSwitch(admin.id)}
                aria-current={admin.id === selected?.id}
                className={`w-full text-left px-2 py-2 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--color-surface-raised)] ${
                  admin.id === selected?.id ? 'bg-[var(--color-surface-raised)]' : ''
                }`}
              >
                <span className="block text-sm font-medium truncate">{admin.fullName}</span>
                <span className="block text-xs text-[var(--color-muted)] truncate">{admin.email}</span>
                {!admin.isActive && <Badge tone="danger" className="mt-1">{t('inactive')}</Badge>}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-4 space-y-4">
        <p className="text-xs text-[var(--color-muted)]">{t('superadminNotice')}</p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--color-muted)]">{t('presets.title')}</span>
          {PERMISSION_PRESET_IDS.map((preset) => (
            <Button key={preset} variant="outline" size="sm" onClick={() => applyPreset(preset)}>
              {t(`presets.${preset}`)}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => applyPreset('standard')}>
            <RotateCcw size={14} />
            {t('reset')}
          </Button>
        </div>

        {draft && <PermissionsMatrix value={draft} onToggle={toggle} disabled={saveMutation.isPending} />}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <p role="status" className={`text-sm ${isDirty ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--color-muted)]'}`}>
            {isDirty ? t('unsaved', { count: changes.length }) : t('upToDate')}
          </p>
          <Button
            disabled={!isDirty || !selected}
            isLoading={saveMutation.isPending}
            onClick={() => selected && draft && saveMutation.mutate({ adminId: selected.id, permissions: draft })}
          >
            {t('save')}
          </Button>
        </div>
      </Card>

      <ConfirmDialog
        open={pendingSwitchId !== null}
        onOpenChange={(open) => !open && setPendingSwitchId(null)}
        title={t('discard.title')}
        description={t('discard.description')}
        confirmLabel={t('discard.confirm')}
        cancelLabel={t('discard.cancel')}
        destructive
        onConfirm={() => {
          setSelectedId(pendingSwitchId);
          setPendingSwitchId(null);
        }}
      />
    </div>
  );
}
