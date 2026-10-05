'use server';

// src/app/actions/admin/users.ts
import { getLocale } from 'next-intl/server';
import { ListAdmins } from '@/application/users/ListAdmins';
import { InviteAdmin } from '@/application/users/InviteAdmin';
import { ResendInvitation } from '@/application/users/ResendInvitation';
import { ChangeAdminRole } from '@/application/users/ChangeAdminRole';
import { DeactivateAdmin, ReactivateAdmin } from '@/application/users/SetAdminActive';
import type { AdminProfile } from '@/domain/user/AdminProfile';
import { SupabaseAdminRepository } from '@/infrastructure/supabase/repositories/SupabaseAdminRepository';
import { SupabaseAdminInviter } from '@/infrastructure/supabase/SupabaseAdminInviter';
import { ResendEmailProvider } from '@/infrastructure/email/ResendEmailProvider';
import { SupabaseAuditLogger } from '@/infrastructure/audit/SupabaseAuditLogger';
import { createClient } from '@/infrastructure/supabase/server';
import { requireSuperadminActor } from '@/lib/auth/requireSuperadminActor';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';
import { adminIdSchema, changeAdminRoleSchema, inviteAdminSchema } from '@/lib/validation/users';
import type { UserRole } from '@/domain/user/UserRole';

/** DTO plat (voir holidays.ts : les classes de domaine ne traversent pas la frontière Server Action). */
export type AdminUserDTO = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

function toDTO(profile: AdminProfile): AdminUserDTO {
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.fullName,
    role: profile.role,
    isActive: profile.isActive,
    createdAt: profile.createdAt.toISOString(),
  };
}

async function buildRepository() {
  return new SupabaseAdminRepository(await createClient());
}

type ListResult = { success: true; users: AdminUserDTO[]; currentUserId: string } | ActionFailure;
type UserResult = { success: true; user: AdminUserDTO } | ActionFailure;
type VoidResult = { success: true } | ActionFailure;

export async function listAdminsAction(): Promise<ListResult> {
  try {
    const { admin } = await requireSuperadminActor();
    const users = await new ListAdmins(await buildRepository()).execute();
    return { success: true, users: users.map(toDTO), currentUserId: admin.id };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function inviteAdminAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = inviteAdminSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const { actor } = await requireSuperadminActor();
    const locale = await getLocale();
    const useCase = new InviteAdmin(
      await buildRepository(),
      new SupabaseAdminInviter(new ResendEmailProvider()),
      new SupabaseAuditLogger(),
    );

    await useCase.execute({ ...actor, ...parsed.data, locale });
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function resendInvitationAction(input: unknown): Promise<VoidResult> {
  try {
    const parsed = adminIdSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const { actor } = await requireSuperadminActor();
    const locale = await getLocale();
    const useCase = new ResendInvitation(
      await buildRepository(),
      new SupabaseAdminInviter(new ResendEmailProvider()),
      new SupabaseAuditLogger(),
    );

    await useCase.execute({ ...actor, adminId: parsed.data.adminId, locale });
    return { success: true };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function changeAdminRoleAction(input: unknown): Promise<UserResult> {
  try {
    const parsed = changeAdminRoleSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const { actor } = await requireSuperadminActor();
    const updated = await new ChangeAdminRole(await buildRepository(), new SupabaseAuditLogger()).execute({
      ...actor,
      ...parsed.data,
    });
    return { success: true, user: toDTO(updated) };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function deactivateAdminAction(input: unknown): Promise<UserResult> {
  return setActive(input, DeactivateAdmin);
}

export async function reactivateAdminAction(input: unknown): Promise<UserResult> {
  return setActive(input, ReactivateAdmin);
}

async function setActive(input: unknown, UseCase: typeof DeactivateAdmin | typeof ReactivateAdmin): Promise<UserResult> {
  try {
    const parsed = adminIdSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const { actor } = await requireSuperadminActor();
    const updated = await new UseCase(await buildRepository(), new SupabaseAuditLogger()).execute({
      ...actor,
      adminId: parsed.data.adminId,
    });
    return { success: true, user: toDTO(updated) };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
