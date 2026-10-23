// src/lib/validation/permissions.ts
import { z } from 'zod';
import { PERMISSION_ACTIONS, PERMISSION_DOMAINS, type PermissionGrid } from '@/domain/user/PermissionCatalog';

/** Une ligne de la matrice : toutes les actions, booléens stricts (pas de chaîne « true »). */
const actionRowSchema = z.object(
  Object.fromEntries(PERMISSION_ACTIONS.map((action) => [action, z.boolean()])) as Record<
    (typeof PERMISSION_ACTIONS)[number],
    z.ZodBoolean
  >,
);

/** Grille complète exigée : une requête partielle est une requête malformée, pas une « mise à jour partielle ». */
export const permissionGridSchema = z.object(
  Object.fromEntries(PERMISSION_DOMAINS.map((domain) => [domain, actionRowSchema])) as Record<
    (typeof PERMISSION_DOMAINS)[number],
    typeof actionRowSchema
  >,
) satisfies z.ZodType<PermissionGrid>;

export const updateAdminPermissionsSchema = z.object({
  adminId: z.uuid({ error: 'invalid' }),
  permissions: permissionGridSchema,
});
