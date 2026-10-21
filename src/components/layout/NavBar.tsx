// src/components/layout/Navbar.tsx
'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Menu, X, ChevronDown, Phone } from 'lucide-react';
import { cn, t } from '@/lib/utils';
import { getLocalizedPath, Locale } from '@/lib/routing';
import { mainNavLinks } from '@/data/navigation';
import { company } from '@/data/company';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher';
import { Button } from '@/components/ui/Button';
import { BookingDialog } from '@/components/booking/BookingDialog';
import { isBookingPagePath } from '@/lib/booking/bookingRoutes';
import type { Service } from '@/types';
import { ShowImage } from '../ui/ShowImage';

type NavbarProps = {
  services: Service[];
};

export function Navbar({ services }: NavbarProps) {
  // Clés issues de fr.json : "nav.openMenu", "nav.closeMenu", "nav.bookAppointment"
  const tNav = useTranslations('nav');
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  // La page /rdv héberge déjà le wizard : ses boutons d'ouverture en modale sont masqués.
  const onBookingPage = isBookingPagePath(pathname);

  const [isMenuOpen, setIsMenuOpen]   = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled]   = useState(false);
  // Wizard de réservation — partagé par le bouton desktop ET le bouton mobile,
  // sur le même modèle que FloatingCTA (même BookingDialog, deux déclencheurs).
  const [bookingOpen, setBookingOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const [previousPathname, setPreviousPathname] = useState(pathname);
  if (previousPathname !== pathname) {
    setPreviousPathname(pathname);
    setIsMenuOpen(false);
    setOpenDropdown(null);
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' || pathname === `/${locale}` : pathname.includes(href);

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      isScrolled
        ? 'bg-[var(--color-surface)]/95 backdrop-blur-sm shadow-[var(--shadow-md)] border-b border-[var(--color-border)]'
        : 'bg-transparent'
    )}>
      <div className="container-custom">
        <nav className="flex items-center justify-between h-16 lg:h-20">

          {/* Logo */}
          <Link href={getLocalizedPath('/', locale)} className="flex items-center gap-2 font-[var(--font-display)] font-bold text-2xl">
            <ShowImage width={40} height={40} />
          </Link>

          {/* Desktop nav */}
          <ul className="hidden lg:flex items-center gap-1">
            {mainNavLinks.map((link) => (
              <li key={link.href} className="relative">
                {link.children ? (
                  <>
                    <button
                      onClick={() => setOpenDropdown(openDropdown === link.href ? null : link.href)}
                      className={cn(
                        'flex items-center gap-1 px-4 py-2 rounded-[var(--radius-md)]',
                        'font-[var(--font-display)] font-semibold text-sm uppercase tracking-wide transition-colors duration-200',
                        isActive(link.href)
                          ? 'text-[var(--color-primary)]'
                          : 'text-[var(--color-foreground)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-raised)]'
                      )}
                    >
                      {t(link.label, locale)}
                      <ChevronDown size={14} className={cn('transition-transform duration-200', openDropdown === link.href && 'rotate-180')} />
                    </button>

                    {openDropdown === link.href && (
                      <div className="absolute top-full left-0 mt-1 w-56 bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] border border-[var(--color-border)] py-2 z-50">
                        {link.children.map((child) => (
                          <Link
                            key={child.href}
                            href={getLocalizedPath(child.href, locale)}
                            className="block px-4 py-2.5 text-sm hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-primary)] transition-colors"
                          >
                            {t(child.label, locale)}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={getLocalizedPath(link.href, locale)}
                    className={cn(
                      'px-4 py-2 rounded-[var(--radius-md)]',
                      'font-[var(--font-display)] font-semibold text-sm uppercase tracking-wide transition-colors duration-200',
                      isActive(link.href)
                        ? 'text-[var(--color-primary)]'
                        : 'text-[var(--color-foreground)] hover:text-[var(--color-primary)] hover:bg-[var(--color-surface-raised)]'
                    )}
                  >
                    {t(link.label, locale)}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-3">
            <a href={`tel:${company.contact.phone}`} className="flex items-center gap-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
              <Phone size={15} />
              {company.contact.phone}
            </a>
            <LocaleSwitcher />
            <ThemeToggle />
            {/* Clé fr.json : nav.bookAppointment */}
            {!onBookingPage && (
              <Button size="sm" variant="secondary" onClick={() => setBookingOpen(true)}>
                {tNav('bookAppointment')}
              </Button>
            )}
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-2 lg:hidden">
            <LocaleSwitcher />
            <ThemeToggle />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? tNav('closeMenu') : tNav('openMenu')}
              className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-surface-raised)] transition-colors"
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </nav>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="container-custom py-4 space-y-1">
            {mainNavLinks.map((link) => (
              <div key={link.href}>
                <Link
                  href={getLocalizedPath(link.href, locale)}
                  className={cn(
                    'block px-4 py-3 rounded-[var(--radius-md)]',
                    'font-[var(--font-display)] font-semibold text-sm uppercase tracking-wide transition-colors',
                    isActive(link.href)
                      ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                      : 'hover:bg-[var(--color-surface-raised)]'
                  )}
                >
                  {t(link.label, locale)}
                </Link>
                {link.children && (
                  <div className="ml-4 space-y-1">
                    {link.children.map((child) => (
                      <Link
                        key={child.href}
                        href={getLocalizedPath(child.href, locale)}
                        className="block px-4 py-2 text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors"
                      >
                        {t(child.label, locale)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {!onBookingPage && (
              <div className="pt-4 border-t border-[var(--color-border)]">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setBookingOpen(true);
                  }}
                >
                  {tNav('bookAppointment')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <BookingDialog services={services} open={bookingOpen} onOpenChange={setBookingOpen} />
    </header>
  );
}