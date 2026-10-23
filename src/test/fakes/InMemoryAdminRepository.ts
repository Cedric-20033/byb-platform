// src/test/fakes/InMemoryAdminRepository.ts
import { DomainError } from '@/domain/shared/DomainError';
import { AdminProfile } from '@/domain/user/AdminProfile';
import type { AdminRepository } from '@/domain/user/AdminRepository';
import { PermissionSet } from '@/domain/user/PermissionSet';
import { USER_ROLES, type UserRole } from '@/domain/user/UserRole';

/** Fabrique un profil de test ; `role` pilote la grille de droits via PermissionSet. */
export function buildAdminProfile(
  overrides: Partial<{ id: string; email: string; fullName: string; role: UserRole; isActive: boolean }> = {},
): AdminProfile {
  const role = overrides.role ?? USER_ROLES.ADMIN;
  return new AdminProfile(
    overrides.id ?? 'admin-1',
    overrides.email ?? 'admin@example.com',
    overrides.fullName ?? 'Admin Test',
    PermissionSet.defaults(role),
    overrides.isActive ?? true,
    new Date('2026-01-01T00:00:00Z'),
  );
}

export class InMemoryAdminRepository implements AdminRepository {
  private readonly profiles = new Map<string, AdminProfile>();

  constructor(initial: AdminProfile[] = []) {
    initial.forEach((profile) => this.profiles.set(profile.id, profile));
  }

  async findAll(): Promise<AdminProfile[]> {
    return [...this.profiles.values()];
  }

  async findById(id: string): Promise<AdminProfile | null> {
    return this.profiles.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<AdminProfile | null> {
    const wanted = email.toLowerCase();
    return [...this.profiles.values()].find((p) => p.email.toLowerCase() === wanted) ?? null;
  }

  async updateRole(id: string, role: UserRole): Promise<AdminProfile> {
    const current = this.require(id);
    return this.store(new AdminProfile(current.id, current.email, current.fullName, PermissionSet.from(role, current.permissions.toJSON()), current.isActive, current.createdAt));
  }

  async updatePermissions(id: string, permissions: PermissionSet): Promise<AdminProfile> {
    const current = this.require(id);
    return this.store(new AdminProfile(current.id, current.email, current.fullName, permissions, current.isActive, current.createdAt));
  }

  async setActive(id: string, isActive: boolean): Promise<AdminProfile> {
    const current = this.require(id);
    return this.store(new AdminProfile(current.id, current.email, current.fullName, current.permissions, isActive, current.createdAt));
  }

  private require(id: string): AdminProfile {
    const profile = this.profiles.get(id);
    if (!profile) throw new DomainError(`Compte introuvable : ${id}`, 'ADMIN_NOT_FOUND');
    return profile;
  }

  private store(profile: AdminProfile): AdminProfile {
    this.profiles.set(profile.id, profile);
    return profile;
  }
}
