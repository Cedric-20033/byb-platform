// src/domain/user/AdminRepository.ts
import type { AdminProfile } from './AdminProfile';
import type { PermissionSet } from './PermissionSet';
import type { UserRole } from './UserRole';

/**
 * Port de sortie : persistance des comptes du back-office.
 * Les écritures renvoient le profil à jour, ce qui évite une relecture
 * aux use cases qui doivent tracer un avant/après dans le journal d'audit.
 */
export interface AdminRepository {
  findAll(): Promise<AdminProfile[]>;
  findById(id: string): Promise<AdminProfile | null>;
  /** Recherche insensible à la casse. */
  findByEmail(email: string): Promise<AdminProfile | null>;
  updateRole(id: string, role: UserRole): Promise<AdminProfile>;
  updatePermissions(id: string, permissions: PermissionSet): Promise<AdminProfile>;
  setActive(id: string, isActive: boolean): Promise<AdminProfile>;
}
