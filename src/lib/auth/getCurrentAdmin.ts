// src/lib/auth/getCurrentAdmin.ts
import { createClient } from '@/infrastructure/supabase/server';
import { ActorRole } from '@/domain/shared/AuditLogger';
import { USER_ROLES, type PermissionDomain, type PermissionAction, type UserRole } from '@/lib/constants';
import type { PermissionsMap } from '@/types';

export type CurrentAdmin = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  permissions: PermissionsMap;
};

/**
 * Résout l'admin actuellement connecté à partir de sa session Supabase.
 * Centralise la jointure auth.users → profiles pour que chaque Server Action
 * n'ait pas à la réécrire.
 *
 * Le middleware protège déjà /dashboard, mais cette vérification reste la
 * dernière ligne de défense au niveau de chaque action serveur.
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Non authentifié.');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, permissions')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new Error('Profil administrateur introuvable.');
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: parseUserRole(profile.role),
    permissions: (profile.permissions ?? {}) as PermissionsMap,
  };
}

/**
 * profiles.role est une colonne `text` libre en base (voir la contrainte
 * CHECK ajoutée dans 0004_profiles_role_check.sql) — Supabase la génère donc
 * en `string`, pas en littéral strict. On valide ici plutôt que de faire un
 * cast aveugle : une valeur corrompue échoue explicitement au lieu de se
 * propager silencieusement dans les vérifications RBAC.
 */
function parseUserRole(role: string): UserRole {
  if (role === USER_ROLES.SUPERADMIN || role === USER_ROLES.ADMIN) return role;
  throw new Error(`Rôle administrateur invalide en base : "${role}"`);
}

/**
 * Vérifie qu'un admin a la permission demandée. Le superadmin passe toujours
 * ("le superadmin peut tout faire"). Lève une erreur sinon.
 */
export function assertPermission(
  admin: CurrentAdmin,
  domain: PermissionDomain,
  action: PermissionAction,
): void {
  if (admin.role === 'superadmin') return;
  if (admin.permissions[domain]?.[action]) return;
  throw new Error(`Action non autorisée : ${domain}.${action}`);
}

/**
 * UserRole ('superadmin' | 'admin') et ActorRole (enum du domaine, incluant
 * aussi CLIENT/SYSTEM) partagent les mêmes valeurs textuelles pour ces deux cas,
 * mais restent deux types distincts par conception — ce mapping évite un cast brut.
 */
export function toActorRole(role: UserRole): ActorRole {
  return role === 'superadmin' ? ActorRole.SUPERADMIN : ActorRole.ADMIN;
}
