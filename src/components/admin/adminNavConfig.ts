// src/components/admin/adminNavConfig.ts
import {
  LayoutDashboard,
  CalendarCheck,
  CalendarClock,
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
import { ADMIN_ROUTES } from '@/lib/constants';

/**
 * Déclaration centrale des entrées de la sidebar admin.
 *
 * `available: false` = module prévu mais non encore implémenté : l'entrée
 * reste visible (le client voit la feuille de route du produit) mais n'est
 * pas cliquable, avec un badge "Bientôt". Quand un module est développé,
 * il suffit de basculer son `available` à true et de renseigner sa route.
 */
export type AdminNavItem = {
  /** Clé de traduction sous admin.nav.* dans messages/*.json */
  labelKey: string;
  href: string;
  icon: LucideIcon;
  available: boolean;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { labelKey: 'dashboard', href: ADMIN_ROUTES.DASHBOARD, icon: LayoutDashboard, available: true },
  { labelKey: 'appointments', href: ADMIN_ROUTES.APPOINTMENTS, icon: CalendarCheck, available: true },
  { labelKey: 'slots', href: ADMIN_ROUTES.SLOTS, icon: CalendarClock, available: true },
  { labelKey: 'holidays', href: ADMIN_ROUTES.HOLIDAYS, icon: CalendarOff, available: true },
  { labelKey: 'services', href: ADMIN_ROUTES.SERVICES, icon: Wrench, available: false },
  { labelKey: 'projects', href: '/dashboard/projects', icon: GalleryHorizontal, available: false },
  { labelKey: 'testimonials', href: '/dashboard/testimonials', icon: MessageSquareQuote, available: false },
  { labelKey: 'permissions', href: ADMIN_ROUTES.PERMISSIONS, icon: ShieldCheck, available: false },
  { labelKey: 'users', href: ADMIN_ROUTES.USERS, icon: Users, available: false },
  { labelKey: 'auditLogs', href: ADMIN_ROUTES.AUDIT_LOGS, icon: ScrollText, available: false },
  { labelKey: 'settings', href: '/dashboard/settings', icon: Settings, available: false },
];
