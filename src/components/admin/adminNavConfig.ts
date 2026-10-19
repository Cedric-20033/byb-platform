// src/components/admin/adminNavConfig.ts
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarOff,
  ShieldCheck,
  Wrench,
  GalleryHorizontal,
  MessageSquareQuote,
  Users,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { ADMIN_ROUTES, USER_ROLES, type PermissionAction, type PermissionDomain, type UserRole } from '@/lib/constants';

/**
 * Déclaration centrale des entrées de la sidebar admin.
 *
 * `available: false` = module prévu mais non encore implémenté : l'entrée
 * reste visible (le client voit la feuille de route du produit) mais n'est
 * pas cliquable, avec un badge "Bientôt". Quand un module est développé,
 * il suffit de basculer son `available` à true et de renseigner sa route.
 *
 * Visibilité : `requiredRole` et `requiredPermission` se cumulent. Une entrée
 * sans condition est visible de tout admin connecté.
 */
export type AdminNavItem = {
  /** Clé de traduction sous admin.nav.* dans messages/*.json */
  labelKey: string;
  href: string;
  icon: LucideIcon;
  available: boolean;
  requiredRole?: UserRole;
  requiredPermission?: { domain: PermissionDomain; action: PermissionAction };
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { labelKey: 'dashboard', href: ADMIN_ROUTES.DASHBOARD, icon: LayoutDashboard, available: true },
  {
    labelKey: 'appointments',
    href: ADMIN_ROUTES.APPOINTMENTS,
    icon: CalendarCheck,
    available: true,
    requiredPermission: { domain: 'appointments', action: 'view' },
  },
  {
    labelKey: 'calendar',
    href: ADMIN_ROUTES.CALENDAR,
    icon: CalendarDays,
    available: true,
    requiredPermission: { domain: 'appointments', action: 'view' },
  },
  {
    labelKey: 'slots',
    href: ADMIN_ROUTES.SLOTS,
    icon: CalendarClock,
    available: true,
    requiredPermission: { domain: 'slots', action: 'view' },
  },
  {
    labelKey: 'holidays',
    href: ADMIN_ROUTES.HOLIDAYS,
    icon: CalendarOff,
    available: true,
    requiredPermission: { domain: 'holidays', action: 'view' },
  },
  {
    labelKey: 'services',
    href: ADMIN_ROUTES.SERVICES,
    icon: Wrench,
    available: true,
    requiredPermission: { domain: 'services', action: 'view' },
  },
  {
    // Les Réalisations sont les médias des services (`service_media`) : elles suivent les droits `services.*`.
    labelKey: 'realisations',
    href: ADMIN_ROUTES.REALISATIONS,
    icon: GalleryHorizontal,
    available: true,
    requiredPermission: { domain: 'services', action: 'view' },
  },
  {
    labelKey: 'testimonials',
    href: ADMIN_ROUTES.TESTIMONIALS,
    icon: MessageSquareQuote,
    available: true,
    requiredPermission: { domain: 'testimonials', action: 'view' },
  },
  {
    labelKey: 'permissions',
    href: ADMIN_ROUTES.PERMISSIONS,
    icon: ShieldCheck,
    available: true,
    requiredRole: USER_ROLES.SUPERADMIN,
  },
  {
    labelKey: 'users',
    href: ADMIN_ROUTES.USERS,
    icon: Users,
    available: true,
    requiredRole: USER_ROLES.SUPERADMIN,
  },
  {
    labelKey: 'auditLogs',
    href: ADMIN_ROUTES.AUDIT_LOGS,
    icon: ScrollText,
    available: true,
    requiredPermission: { domain: 'audit_logs', action: 'view' },
  },
  {
    labelKey: 'settings',
    href: ADMIN_ROUTES.SETTINGS,
    icon: Settings,
    available: true,
    requiredPermission: { domain: 'settings', action: 'view' },
  },
];

type NavAccess = {
  role: UserRole;
  can: (domain: PermissionDomain, action: PermissionAction) => boolean;
};

/**
 * Ne conserve que les entrées auxquelles l'admin a accès. Fonction pure,
 * testable sans rendu : la sidebar se contente de l'appeler.
 */
export function filterNavItems(items: AdminNavItem[], { role, can }: NavAccess): AdminNavItem[] {
  return items.filter((item) => {
    if (item.requiredRole && item.requiredRole !== role) return false;
    if (item.requiredPermission && !can(item.requiredPermission.domain, item.requiredPermission.action)) return false;
    return true;
  });
}
