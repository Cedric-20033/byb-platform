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
 * Le superadmin ajuste ces permissions pour chaque admin depuis /dashboard/permissions.
 * Le superadmin lui-même n'a pas besoin d'entrée dans ce système : son rôle
 * suffit à tout autoriser (voir les policies RLS : current_role_name() = 'superadmin').
 */
export const PERMISSION_DOMAINS = [
  'appointments',
  'slots',
  'holidays',
  'services',
  'users',
  'audit_logs',
] as const;

export type PermissionDomain = (typeof PERMISSION_DOMAINS)[number];

/**
 * Actions disponibles par domaine de permission.
 * 'export' est distinct de 'view' : le cahier des charges autorise l'admin
 * à consulter les RDV sans nécessairement pouvoir en extraire les données.
 */
export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete', 'export'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/**
 * Permissions par défaut attribuées à un nouvel admin, reflétant le périmètre
 * exact du cahier des charges : consultation + recherche + export des RDV,
 * gestion complète des jours fériés, aucun droit sur services/utilisateurs/logs.
 * Le superadmin peut ajuster individuellement chaque case depuis /dashboard/permissions.
 */
export const DEFAULT_ADMIN_PERMISSIONS: Record<PermissionDomain, Record<PermissionAction, boolean>> = {
  appointments: { view: true, create: false, edit: false, delete: false, export: true },
  slots: { view: true, create: false, edit: false, delete: false, export: false },
  holidays: { view: true, create: true, edit: true, delete: true, export: false },
  services: { view: true, create: false, edit: false, delete: false, export: false },
  users: { view: false, create: false, edit: false, delete: false, export: false },
  audit_logs: { view: false, create: false, edit: false, delete: false, export: false },
} as const;
