// src/lib/auth/requireSuperadminActor.ts
import type { AdminActor } from '@/application/users/AdminActor';
import { getCurrentAdmin, toActorRole, type CurrentAdmin } from '@/lib/auth/getCurrentAdmin';
import { ForbiddenError } from '@/lib/errors';

/**
 * Garde des Server Actions réservées au superadmin (utilisateurs, permissions).
 * Aucune case de la grille ne délègue ces actions (voir NON_DELEGABLE_DOMAINS) :
 * le rôle seul décide. Renvoie aussi l'acteur prêt à être transmis aux use cases.
 */
export async function requireSuperadminActor(): Promise<{ admin: CurrentAdmin; actor: AdminActor }> {
  const admin = await getCurrentAdmin();
  if (!admin.isSuperadmin) throw new ForbiddenError();
  return { admin, actor: { actorId: admin.id, actorRole: toActorRole(admin.role) } };
}
