// src/components/admin/userFilters.test.ts
import { describe, expect, it } from 'vitest';
import type { AdminUserDTO } from '@/app/actions/admin/users';
import { DEFAULT_USER_FILTERS, filterUsers } from './userFilters';

const user = (overrides: Partial<AdminUserDTO>): AdminUserDTO => ({
  id: 'id',
  email: 'a@example.com',
  fullName: 'Alice Martin',
  role: 'admin',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const users = [
  user({ id: '1' }),
  user({ id: '2', fullName: 'Bob Dupont', email: 'bob@example.com', role: 'superadmin' }),
  user({ id: '3', fullName: 'Chloé Roy', email: 'chloe@example.com', isActive: false }),
];

describe('filterUsers', () => {
  it('retourne tout par défaut', () => {
    expect(filterUsers(users, DEFAULT_USER_FILTERS)).toHaveLength(3);
  });

  it('cherche dans le nom et l\'email, sans tenir compte de la casse', () => {
    expect(filterUsers(users, { ...DEFAULT_USER_FILTERS, search: 'DUPONT' }).map((u) => u.id)).toEqual(['2']);
    expect(filterUsers(users, { ...DEFAULT_USER_FILTERS, search: 'chloe@' }).map((u) => u.id)).toEqual(['3']);
  });

  it('combine rôle et statut', () => {
    expect(filterUsers(users, { search: '', role: 'admin', status: 'inactive' }).map((u) => u.id)).toEqual(['3']);
  });
});
