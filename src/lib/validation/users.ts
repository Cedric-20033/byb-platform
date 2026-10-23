// src/lib/validation/users.ts
import { z } from 'zod';
import { USER_ROLES } from '@/lib/constants';

const roleSchema = z.enum([USER_ROLES.ADMIN, USER_ROLES.SUPERADMIN], { error: 'invalid' });

/** Invitation d'un compte du back-office. Les messages sont des clés `errors.validation.*`. */
export const inviteAdminSchema = z.object({
  email: z.email({ error: 'emailInvalid' }),
  fullName: z.string().trim().min(2, { error: 'invalid' }).max(100, { error: 'invalid' }),
  role: roleSchema,
});

export type InviteAdminValues = z.infer<typeof inviteAdminSchema>;

export const adminIdSchema = z.object({ adminId: z.uuid({ error: 'invalid' }) });

export const changeAdminRoleSchema = adminIdSchema.extend({ role: roleSchema });
