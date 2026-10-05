// src/lib/constants.ts

/**
 * Locales supportées par l'application.
 * Synchronisé avec src/lib/routing.ts
 */
export const LOCALES = ['fr', 'en', 'de'] as const;
export const DEFAULT_LOCALE = 'fr' as const;

/**
 * Routes publiques de l'application.
 */
export const PUBLIC_ROUTES = {
  HOME: '/',
  SERVICES: '/services',
  REALISATIONS: '/realisations',
  ABOUT: '/a-propos',
  CONTACT: '/contact',
  BOOKING: '/rdv',
  LEGAL: '/mentions-legales',
  PRIVACY: '/politique-confidentialite',
} as const;

/**
 * Routes d'authentification (hors dashboard, accessibles sans session).
 */
export const AUTH_ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  ACCEPT_INVITATION: '/accept-invitation',
} as const;

/**
 * Routes du dashboard admin.
 * Toutes ces routes sont protégées par le middleware.
 */
export const ADMIN_ROUTES = {
  DASHBOARD: '/dashboard',
  SERVICES: '/dashboard/services',
  USERS: '/dashboard/users',
  PERMISSIONS: '/dashboard/permissions',
  AUDIT_LOGS: '/dashboard/audit-logs',
  APPOINTMENTS: '/dashboard/appointments',
  SLOTS: '/dashboard/slots',
  HOLIDAYS: '/dashboard/holidays',
  ACCOUNT: '/dashboard/account',
} as const;

/**
 * Le modèle RBAC (rôles, domaines, actions, permissions par défaut) appartient
 * au domaine : il est défini dans `domain/user/` et simplement ré-exporté ici
 * pour que les imports historiques `@/lib/constants` restent valides.
 */
export { USER_ROLES, type UserRole } from '@/domain/user/UserRole';
export {
  PERMISSION_DOMAINS,
  PERMISSION_ACTIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  type PermissionDomain,
  type PermissionAction,
} from '@/domain/user/PermissionCatalog';
