// src/lib/auth/getCurrentAdmin.ts
import { createClient } from '@/infrastructure/supabase/server';
import { SupabaseAdminRepository } from '@/infrastructure/supabase/repositories/SupabaseAdminRepository';
import { ActorRole } from '@/domain/shared/AuditLogger';
import type { AdminProfile } from '@/domain/user/AdminProfile';
import type { PermissionAction, PermissionDomain } from '@/domain/user/PermissionCatalog';
import { USER_ROLES, type UserRole } from '@/domain/user/UserRole';
import { ForbiddenError, UnauthenticatedError } from '@/lib/errors';

/** L'admin connecté est directement l'entité du domaine (`can()`, `role`, `permissions`). */
export type CurrentAdmin = AdminProfile;

/**
 * Résout l'admin actuellement connecté à partir de sa session Supabase.
 * Centralise la jointure auth.users → profiles pour que chaque Server Action
 * n'ait pas à la réécrire.
 *
 * Le proxy protège déjà /dashboard, mais cette vérification reste la
 * dernière ligne de défense au niveau de chaque action serveur.
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthenticatedError();
  }

  const profile = await new SupabaseAdminRepository(supabase).findById(user.id);

  if (!profile) {
    throw new UnauthenticatedError('Profil administrateur introuvable.');
  }

  // Le jeton de session d'un compte désactivé reste valide jusqu'à son
  // expiration : le refus explicite ici coupe l'accès sans attendre
  // (le RLS ignore aussi les profils inactifs, voir migration 0005).
  if (!profile.isActive) {
    throw new UnauthenticatedError('Compte administrateur désactivé.');
  }

  return profile;
}

/**
 * Vérifie qu'un admin a la permission demandée ; lève ForbiddenError sinon.
 * La règle elle-même ("le superadmin peut tout", compte actif) vit dans le
 * domaine : cette fonction n'ajoute que la traduction en erreur applicative.
 */
export function assertPermission(
  admin: CurrentAdmin,
  domain: PermissionDomain,
  action: PermissionAction,
): void {
  if (admin.can(domain, action)) return;
  throw new ForbiddenError(`Action non autorisée : ${domain}.${action}`);
}

/**
 * UserRole ('superadmin' | 'admin') et ActorRole (enum du domaine, incluant
 * aussi CLIENT/SYSTEM) partagent les mêmes valeurs textuelles pour ces deux cas,
 * mais restent deux types distincts par conception — ce mapping évite un cast brut.
 */
export function toActorRole(role: UserRole): ActorRole {
  return role === USER_ROLES.SUPERADMIN ? ActorRole.SUPERADMIN : ActorRole.ADMIN;
}
