// src/components/admin/Can.tsx
'use client';

import type { PermissionAction, PermissionDomain } from '@/domain/user/PermissionCatalog';
import { usePermissions } from './PermissionsProvider';

interface CanProps {
  domain: PermissionDomain;
  action: PermissionAction;
  /** Rendu alternatif quand le droit manque (rien par défaut). */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Affiche ses enfants uniquement si l'admin connecté a le droit demandé.
 *
 * @example
 * <Can domain="services" action="create"><Button>Créer un service</Button></Can>
 */
export function Can({ domain, action, fallback = null, children }: CanProps) {
  const { can } = usePermissions();
  return <>{can(domain, action) ? children : fallback}</>;
}
