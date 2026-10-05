'use server';

// src/app/actions/admin/permissions.ts
import { ListAdmins } from '@/application/users/ListAdmins';
import { UpdateAdminPermissions } from '@/application/users/UpdateAdminPermissions';
import type { AdminProfile } from '@/domain/user/AdminProfile';
import type { PermissionGrid } from '@/domain/user/PermissionCatalog';
import { SupabaseAdminRepository } from '@/infrastructure/supabase/repositories/SupabaseAdminRepository';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { createClient } from '@/infrastructure/supabase/server';
import { requireSuperadminActor } from '@/lib/auth/requireSuperadminActor';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';
import { updateAdminPermissionsSchema } from '@/lib/validation/permissions';

/** DTO plat : un admin éditable et sa grille de droits complète. */
export type AdminPermissionsDTO = {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  permissions: PermissionGrid;
};

function toDTO(profile: AdminProfile): AdminPermissionsDTO {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    isActive: profile.isActive,
    permissions: profile.permissions.toJSON(),
  };
}

type ListResult = { success: true; admins: AdminPermissionsDTO[] } | ActionFailure;
type UpdateResult = { success: true; admin: AdminPermissionsDTO } | ActionFailure;

/** Comptes dont les droits sont réglables : les superadmins n'ont pas de grille propre. */
export async function listAdminPermissionsAction(): Promise<ListResult> {
  try {
    await requireSuperadminActor();
    const profiles = await new ListAdmins(new SupabaseAdminRepository(await createClient())).execute();
    return { success: true, admins: profiles.filter((profile) => !profile.isSuperadmin).map(toDTO) };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function updateAdminPermissionsAction(input: unknown): Promise<UpdateResult> {
  try {
    const parsed = updateAdminPermissionsSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const { actor } = await requireSuperadminActor();
    const { admin } = await new UpdateAdminPermissions(
      new SupabaseAdminRepository(await createClient()),
      new SupabaseAuditLogger(),
    ).execute({ ...actor, adminId: parsed.data.adminId, permissions: parsed.data.permissions });

    return { success: true, admin: toDTO(admin) };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
