// src/lib/constants.ts

/**
 * Locales supportées par l'application.
 * Synchronisé avec src/lib/routing.ts
 */
export const LOCALES = ['fr', 'en', 'de'] as const;
export const DEFAULT_LOCALE = 'fr' as const;

/**
 * Routes publiques de l'application.
 * Utilisé pour la navigation et les sitemaps.
 */
export const PUBLIC_ROUTES = {
  HOME: '/',
  SERVICES: '/services',
  REALISATIONS: '/realisations',
  ABOUT: '/a-propos',
  CONTACT: '/contact',
  // [PRÉVU — phase 2] DEVIS: '/devis',
  LEGAL: '/mentions-legales',
  PRIVACY: '/politique-confidentialite',
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
  // [PRÉVU — phase 2]
  // APPOINTMENTS: '/dashboard/appointments',
  // SLOTS: '/dashboard/slots',
} as const;

/**
 * Rôles RBAC disponibles dans l'application.
 */
export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Domaines de permissions pour le système RBAC.
 * Le superadmin peut activer/désactiver ces permissions pour chaque admin.
 */
export const PERMISSION_DOMAINS = [
  'appointments',
  'slots',
  'services',
  'users',
  'audit_logs',
] as const;

export type PermissionDomain = (typeof PERMISSION_DOMAINS)[number];

/**
 * Actions disponibles par domaine de permission.
 */
export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];