// src/components/admin/AdminShell.tsx
'use client';

import { useState } from 'react';
import type { UserRole } from '@/lib/constants';
import type { Service } from '@/types';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { AdminSidebar } from './AdminSidebar';
import { AdminNavbar } from './AdminNavbar';

interface AdminShellProps {
  fullName: string;
  role: UserRole;
  services: Service[];
  children: React.ReactNode;
}

/**
 * Coquille cliente du dashboard : regroupe la sidebar, la navbar et le
 * fournisseur TanStack Query. Reste un composant client uniquement parce
 * qu'il porte l'état d'ouverture du tiroir mobile, partagé entre le bouton
 * "Menu" de la navbar et la sidebar elle-même.
 */
export function AdminShell({ fullName, role, services, children }: AdminShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <QueryProvider>
      <div className="flex h-screen overflow-hidden bg-[var(--color-background)]">
        <AdminSidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

        <div className="flex-1 flex flex-col min-w-0">
          <AdminNavbar fullName={fullName} role={role} services={services} onMenuClick={() => setMobileSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </QueryProvider>
  );
}
