// src/lib/auth/actionPermissions.ts
import type { AdminProfile } from '@/domain/user/AdminProfile';
import type { PermissionAction, PermissionDomain } from '@/domain/user/PermissionCatalog';

/**
 * Matrice de référence « Server Action → droit exigé » (P1.7).
 *
 * C'est la documentation exécutable du RBAC : `actionPermissions.test.ts` échoue
 * si une Server Action n'y figure pas, ou si son code n'applique pas la garde
 * déclarée. Ajouter une action impose donc de décider explicitement qui peut
 * l'appeler. La même matrice est reproduite dans ARCHITECTURE.md.
 *
 * La clé est `<chemin sous src/app/actions>#<nom de la fonction exportée>`.
 */
export type ActionRequirement =
  /** Aucune session : visiteur (réservation, connexion). */
  | { kind: 'public' }
  /** Tout admin actif connecté, sans permission particulière (ex. « Mon compte »). */
  | { kind: 'session' }
  /** Rôle superadmin uniquement, non délégable. */
  | { kind: 'superadmin' }
  /** Toutes les permissions listées sont exigées. */
  | { kind: 'permission'; required: readonly { domain: PermissionDomain; action: PermissionAction }[] };

const need = (domain: PermissionDomain, ...actions: PermissionAction[]): ActionRequirement => ({
  kind: 'permission',
  required: actions.map((action) => ({ domain, action })),
});

const PUBLIC: ActionRequirement = { kind: 'public' };
const SESSION: ActionRequirement = { kind: 'session' };
const SUPERADMIN: ActionRequirement = { kind: 'superadmin' };

export const ACTION_REQUIREMENTS: Record<string, ActionRequirement> = {
  // Authentification
  'auth.ts#signInAction': PUBLIC,
  'auth.ts#signOutAction': PUBLIC,
  'password.ts#requestPasswordResetAction': PUBLIC,
  'password.ts#setPasswordAction': SESSION,
  'password.ts#changePasswordAction': SESSION,

  // Réservation publique (service_role côté serveur, aucune donnée admin)
  'booking/createAppointment.ts#createAppointmentAction': PUBLIC,
  'booking/cancelAppointment.ts#cancelAppointmentByTokenAction': PUBLIC,
  'booking/getAvailableSlots.ts#getAvailableSlotsAction': PUBLIC,

  // Rendez-vous
  'admin/appointments.ts#listAppointmentsAction': need('appointments', 'view'),
  'admin/appointments.ts#confirmAppointmentAction': need('appointments', 'edit'),
  'admin/appointments.ts#cancelAppointmentAction': need('appointments', 'edit'),
  'admin/appointments.ts#exportAppointmentsAction': need('appointments', 'view', 'export'),

  // Créneaux
  'admin/slots.ts#listSlotsByDateAction': need('slots', 'view'),
  'admin/slots.ts#blockSlotAction': need('slots', 'edit'),
  'admin/slots.ts#unblockSlotAction': need('slots', 'edit'),
  'admin/slots.ts#generateSlotsAction': need('slots', 'create'),

  // Jours fériés et congés
  'admin/holidays.ts#listHolidaysAction': need('holidays', 'view'),
  'admin/holidays.ts#createHolidayAction': need('holidays', 'create'),
  'admin/holidays.ts#deleteHolidayAction': need('holidays', 'delete'),

  // Tableau de bord (chiffres dérivés des rendez-vous)
  'admin/dashboard.ts#getDashboardStatsAction': need('appointments', 'view'),
  'admin/dashboard.ts#getPendingNotificationsAction': need('appointments', 'view'),

  // Journal d'audit (l'export est lui-même tracé)
  'admin/auditLogs.ts#listAuditLogsAction': need('audit_logs', 'view'),
  'admin/auditLogs.ts#exportAuditLogsAction': need('audit_logs', 'view', 'export'),

  // Utilisateurs et permissions : superadmin uniquement
  'admin/users.ts#listAdminsAction': SUPERADMIN,
  'admin/users.ts#inviteAdminAction': SUPERADMIN,
  'admin/users.ts#resendInvitationAction': SUPERADMIN,
  'admin/users.ts#changeAdminRoleAction': SUPERADMIN,
  'admin/users.ts#deactivateAdminAction': SUPERADMIN,
  'admin/users.ts#reactivateAdminAction': SUPERADMIN,
  'admin/permissions.ts#listAdminPermissionsAction': SUPERADMIN,
  'admin/permissions.ts#updateAdminPermissionsAction': SUPERADMIN,
};

/** Évalue la matrice pour un compte donné (utilisé par la table de vérité des tests). */
export function isActionAllowed(admin: AdminProfile | null, requirement: ActionRequirement): boolean {
  switch (requirement.kind) {
    case 'public':
      return true;
    case 'session':
      return admin?.isActive ?? false;
    case 'superadmin':
      return (admin?.isActive && admin.isSuperadmin) ?? false;
    case 'permission':
      return admin !== null && requirement.required.every(({ domain, action }) => admin.can(domain, action));
  }
}
