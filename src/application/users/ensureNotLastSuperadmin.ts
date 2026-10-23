// src/application/users/ensureNotLastSuperadmin.ts
import { DomainError } from '@/domain/shared/DomainError';
import type { AdminProfile } from '@/domain/user/AdminProfile';
import type { AdminRepository } from '@/domain/user/AdminRepository';

/**
 * Garde-fou partagé : l'application doit toujours compter au moins un
 * superadmin actif, sans quoi plus personne ne pourrait gérer les comptes.
 * À appeler avant toute rétrogradation ou désactivation de `target`.
 */
export async function ensureNotLastSuperadmin(repository: AdminRepository, target: AdminProfile): Promise<void> {
  if (!target.isSuperadmin || !target.isActive) return;

  const all = await repository.findAll();
  const otherActiveSuperadmins = all.filter((p) => p.id !== target.id && p.isSuperadmin && p.isActive);

  if (otherActiveSuperadmins.length === 0) {
    throw new DomainError('Au moins un superadmin actif est requis.', 'LAST_SUPERADMIN');
  }
}
