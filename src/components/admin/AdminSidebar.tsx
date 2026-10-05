// src/components/admin/AdminSidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import type { Locale } from '@/lib/routing';
import { getLocalizedPath } from '@/lib/routing';
import { cn } from '@/lib/utils';
import { company } from '@/data/company';
import { ADMIN_NAV_ITEMS, filterNavItems } from './adminNavConfig';
import { usePermissions } from './PermissionsProvider';

interface AdminSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ mobileOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const t = useTranslations('admin.nav');
  const { role, can } = usePermissions();
  const navItems = filterNavItems(ADMIN_NAV_ITEMS, { role, can });

  const content = (
    <div className="flex h-full flex-col bg-[var(--color-surface)] border-r border-[var(--color-border)]">
      <div className="flex items-center gap-2 px-6 h-16 border-b border-[var(--color-border)] shrink-0">
        <Image src="/Images/logo.png" alt={company.name} width={32} height={32} className="rounded-[var(--radius-sm)]" />
        <span className="font-[var(--font-display)] font-black text-[var(--color-primary)] leading-tight text-sm">
          {company.name}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
        {navItems.map((item) => {
          const href = getLocalizedPath(item.href, locale);
          const isActive = item.available && (pathname === href || pathname.startsWith(`${href}/`));
          const Icon = item.icon;

          if (!item.available) {
            return (
              <div
                key={item.labelKey}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-[var(--color-muted)] cursor-not-allowed opacity-60"
              >
                <span className="flex items-center gap-3 text-sm font-medium">
                  <Icon size={18} />
                  {t(item.labelKey)}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wide bg-[var(--color-surface-raised)] px-1.5 py-0.5 rounded">
                  {t('comingSoon')}
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.labelKey}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--color-primary)] text-white shadow-[var(--shadow-sm)]'
                  : 'text-[var(--color-foreground)] hover:bg-[var(--color-surface-raised)]',
              )}
            >
              <Icon size={18} />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop : sidebar fixe, toujours visible */}
      <aside className="hidden lg:block w-64 shrink-0">{content}</aside>

      {/* Mobile : tiroir superposé avec fond assombri, fermé par défaut */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden"
            >
              {content}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
