// src/components/admin/userFilters.ts
import type { AdminUserDTO } from '@/app/actions/admin/users';

export type UserFilters = {
  search: string;
  role: 'all' | AdminUserDTO['role'];
  status: 'all' | 'active' | 'inactive';
};

export const DEFAULT_USER_FILTERS: UserFilters = { search: '', role: 'all', status: 'all' };

/** Filtrage côté client : la liste des comptes d'une PME reste courte, inutile de paginer côté serveur. */
export function filterUsers(users: AdminUserDTO[], { search, role, status }: UserFilters): AdminUserDTO[] {
  const needle = search.trim().toLowerCase();

  return users.filter((user) => {
    if (role !== 'all' && user.role !== role) return false;
    if (status === 'active' && !user.isActive) return false;
    if (status === 'inactive' && user.isActive) return false;
    if (!needle) return true;
    return user.fullName.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle);
  });
}
