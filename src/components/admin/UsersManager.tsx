// src/components/admin/UsersManager.tsx
'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { MailPlus, Search, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { InviteAdminDialog } from '@/components/admin/InviteAdminDialog';
import { DEFAULT_USER_FILTERS, filterUsers, type UserFilters } from '@/components/admin/userFilters';
import { USER_ROLES } from '@/lib/constants';
import { ActionError, type ActionFailure } from '@/lib/errors';
import { formatDate } from '@/lib/utils';
import { useErrorMessage } from '@/lib/useErrorMessage';
import {
  changeAdminRoleAction,
  deactivateAdminAction,
  inviteAdminAction,
  listAdminsAction,
  reactivateAdminAction,
  resendInvitationAction,
  type AdminUserDTO,
} from '@/app/actions/admin/users';
import type { InviteAdminValues } from '@/lib/validation/users';

const USERS_QUERY_KEY = ['admin', 'users'];

/** Action en attente de confirmation par le superadmin. */
type PendingAction =
  | { kind: 'deactivate' | 'reactivate' | 'resend'; user: AdminUserDTO }
  | { kind: 'role'; user: AdminUserDTO; role: AdminUserDTO['role'] };

/** Déballe le résultat d'une action : un échec devient une `ActionError` traduite par `useErrorMessage`. */
function unwrap<T extends { success: true }>(result: T | ActionFailure): T {
  if (!result.success) throw new ActionError(result.error);
  return result;
}

export function UsersManager() {
  const t = useTranslations('admin.users');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const errorMessage = useErrorMessage();

  const [filters, setFilters] = useState<UserFilters>(DEFAULT_USER_FILTERS);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const usersQuery = useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: async () => unwrap(await listAdminsAction()),
  });

  const users = usersQuery.data?.users;
  const currentUserId = usersQuery.data?.currentUserId;
  const visibleUsers = useMemo(() => filterUsers(users ?? [], filters), [users, filters]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });

  const inviteMutation = useMutation({
    mutationFn: async (values: InviteAdminValues) => unwrap(await inviteAdminAction(values)),
    onSuccess: () => {
      toast.success(t('toast.invited'));
      refresh();
    },
    onError: (error: Error) => toast.error(errorMessage(error)),
  });

  const actionMutation = useMutation({
    mutationFn: async (action: PendingAction) => {
      const adminId = action.user.id;
      switch (action.kind) {
        case 'deactivate':
          return unwrap(await deactivateAdminAction({ adminId }));
        case 'reactivate':
          return unwrap(await reactivateAdminAction({ adminId }));
        case 'resend':
          return unwrap(await resendInvitationAction({ adminId }));
        case 'role':
          return unwrap(await changeAdminRoleAction({ adminId, role: action.role }));
      }
    },
    onSuccess: (_result, action) => {
      toast.success(t(`toast.${action.kind}`));
      setPending(null);
      refresh();
    },
    onError: (error: Error) => {
      toast.error(errorMessage(error));
      setPending(null);
    },
  });

  async function handleInvite(values: InviteAdminValues) {
    // `mutateAsync` rejette en cas d'échec : la modale reste ouverte avec la saisie intacte.
    await inviteMutation.mutateAsync(values);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            type="search"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder={t('search')}
            aria-label={t('search')}
            className="w-full pl-9 pr-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
          />
        </div>

        <select
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value as UserFilters['role'] })}
          aria-label={t('filters.role')}
          className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
        >
          <option value="all">{t('filters.allRoles')}</option>
          <option value={USER_ROLES.ADMIN}>{t('roles.admin')}</option>
          <option value={USER_ROLES.SUPERADMIN}>{t('roles.superadmin')}</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value as UserFilters['status'] })}
          aria-label={t('filters.status')}
          className="px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
        >
          <option value="all">{t('filters.allStatuses')}</option>
          <option value="active">{t('status.active')}</option>
          <option value="inactive">{t('status.inactive')}</option>
        </select>

        <Button size="sm" onClick={() => setInviteOpen(true)}>
          <UserPlus size={16} />
          {t('invite')}
        </Button>
      </div>

      <Card className="divide-y divide-[var(--color-border)]">
        {usersQuery.isLoading ? (
          <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('loading')}</p>
        ) : visibleUsers.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('empty')}</p>
        ) : (
          visibleUsers.map((user) => {
            const isSelf = user.id === currentUserId;
            const otherRole = user.role === USER_ROLES.ADMIN ? USER_ROLES.SUPERADMIN : USER_ROLES.ADMIN;

            return (
              <div key={user.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.fullName}
                    {isSelf && <span className="ml-2 text-xs text-[var(--color-muted)]">({t('you')})</span>}
                  </p>
                  <p className="text-xs text-[var(--color-muted)] truncate">
                    {user.email} · {t('createdOn', { date: formatDate(user.createdAt, locale) })}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={user.role === USER_ROLES.SUPERADMIN ? 'info' : 'neutral'}>{t(`roles.${user.role}`)}</Badge>
                  <Badge tone={user.isActive ? 'success' : 'danger'}>
                    {user.isActive ? t('status.active') : t('status.inactive')}
                  </Badge>

                  {/* Aucune action sur soi-même : le serveur la refuse aussi (CANNOT_MODIFY_SELF). */}
                  {!isSelf && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPending({ kind: 'resend', user })}
                        title={t('actions.resend')}
                        aria-label={`${t('actions.resend')} — ${user.fullName}`}
                        className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted)] hover:bg-[var(--color-surface-raised)]"
                      >
                        <MailPlus size={15} />
                      </button>
                      <Button variant="ghost" size="sm" onClick={() => setPending({ kind: 'role', user, role: otherRole })}>
                        {t(otherRole === USER_ROLES.SUPERADMIN ? 'actions.makeSuperadmin' : 'actions.makeAdmin')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPending({ kind: user.isActive ? 'deactivate' : 'reactivate', user })}
                      >
                        {t(user.isActive ? 'actions.deactivate' : 'actions.reactivate')}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Card>

      <InviteAdminDialog open={inviteOpen} onOpenChange={setInviteOpen} onSubmit={handleInvite} />

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? t(`confirm.${pending.kind}.title`) : ''}
        description={pending ? t(`confirm.${pending.kind}.description`, { name: pending.user.fullName }) : ''}
        confirmLabel={t('confirm.confirm')}
        cancelLabel={t('cancel')}
        destructive={pending?.kind === 'deactivate'}
        isSubmitting={actionMutation.isPending}
        onConfirm={() => pending && actionMutation.mutate(pending)}
      />
    </div>
  );
}
