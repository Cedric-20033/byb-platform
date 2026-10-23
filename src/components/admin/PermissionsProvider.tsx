// src/components/admin/PermissionsProvider.tsx
'use client';

import { createContext, useContext, useMemo } from 'react';
import { PermissionSet } from '@/domain/user/PermissionSet';
import type { PermissionAction, PermissionDomain, PermissionGrid } from '@/domain/user/PermissionCatalog';
import type { UserRole } from '@/domain/user/UserRole';

type PermissionsContextValue = {
  role: UserRole;
  isSuperadmin: boolean;
  can: (domain: PermissionDomain, action: PermissionAction) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

interface PermissionsProviderProps {
  role: UserRole;
  /** Grille sérialisée par le layout serveur (`PermissionSet.toJSON()`). */
  permissions: PermissionGrid;
  children: React.ReactNode;
}

/**
 * Expose les droits de l'admin connecté à tout le dashboard.
 *
 * Reconstruit le même `PermissionSet` que celui du serveur : l'interface et la
 * garde serveur appliquent donc exactement la même règle. Ce contexte ne sert
 * qu'à masquer des éléments — la sécurité reste assurée côté serveur et par le RLS.
 */
export function PermissionsProvider({ role, permissions, children }: PermissionsProviderProps) {
  const value = useMemo<PermissionsContextValue>(() => {
    const set = PermissionSet.from(role, permissions);
    return {
      role,
      isSuperadmin: role === 'superadmin',
      can: (domain, action) => set.can(domain, action),
    };
  }, [role, permissions]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions doit être utilisé dans un <PermissionsProvider>.');
  }
  return context;
}
