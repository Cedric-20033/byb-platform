// src/components/admin/AdminNavbar.tsx
'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { Menu, LogOut } from 'lucide-react';
import { useTransition } from 'react';
import { getLocalizedPath, type Locale } from '@/lib/routing';
import { ADMIN_ROUTES, type UserRole } from '@/lib/constants';
import type { Service } from '@/types';
import { signOutAction } from '@/app/actions/auth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { NotificationBell } from './NotificationBell';
import { Can } from './Can';

interface AdminNavbarProps {
  fullName: string;
  role: UserRole;
  services: Service[];
  onMenuClick: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super admin',
  admin: 'Admin',
};

export function AdminNavbar({ fullName, role, services, onMenuClick }: AdminNavbarProps) {
  const t = useTranslations('admin.navbar');
  const tAccount = useTranslations('auth.account');
  const locale = useLocale() as Locale;
  const [isSigningOut, startTransition] = useTransition();

  return (
    <header className="h-16 shrink-0 flex items-center justify-between gap-4 px-4 lg:px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <button
        onClick={onMenuClick}
        aria-label="Menu"
        className="lg:hidden w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--color-surface-raised)] text-[var(--color-foreground)]"
      >
        <Menu size={20} />
      </button>

      {/* Espace réservé pour un futur fil d'ariane / titre de page contextuel */}
      <div className="hidden lg:block flex-1" />

      <div className="flex items-center gap-2 lg:gap-3">
        {/* Les notifications exposent des noms de clients : visibles seulement avec appointments.view. */}
        <Can domain="appointments" action="view">
          <NotificationBell services={services} />
        </Can>
        <ThemeToggle />

        <Link
          href={getLocalizedPath(ADMIN_ROUTES.ACCOUNT, locale)}
          title={tAccount('menuLabel')}
          className="hidden sm:flex flex-col items-end leading-tight pl-2 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-raised)] px-2 py-1 transition-colors"
        >
          <span className="text-sm font-semibold text-[var(--color-foreground)]">{fullName}</span>
          <span className="text-xs text-[var(--color-muted)]">{ROLE_LABELS[role]}</span>
        </Link>

        <button
          disabled={isSigningOut}
          onClick={() => startTransition(() => signOutAction(locale))}
          aria-label={t('logout')}
          title={t('logout')}
          className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted)] hover:text-[var(--color-secondary)] hover:bg-[var(--color-surface-raised)] transition-colors disabled:opacity-50"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
