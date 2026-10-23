// src/application/users/ListAdmins.ts
import type { AdminProfile } from '@/domain/user/AdminProfile';
import type { AdminRepository } from '@/domain/user/AdminRepository';

/** Use case : liste des comptes du back-office. */
export class ListAdmins {
  constructor(private readonly adminRepository: AdminRepository) {}

  execute(): Promise<AdminProfile[]> {
    return this.adminRepository.findAll();
  }
}
