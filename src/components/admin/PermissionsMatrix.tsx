// src/components/admin/PermissionsMatrix.tsx
'use client';

import { useTranslations } from 'next-intl';
import {
  DELEGABLE_DOMAINS,
  PERMISSION_ACTIONS,
  isDelegable,
  type PermissionAction,
  type PermissionDomain,
  type PermissionGrid,
} from '@/domain/user/PermissionCatalog';

type PermissionsMatrixProps = {
  value: PermissionGrid;
  onToggle: (domain: PermissionDomain, action: PermissionAction, allowed: boolean) => void;
  disabled?: boolean;
};

/**
 * Matrice domaines × actions. Composant de présentation pur : l'état (brouillon,
 * enregistrement) vit dans PermissionsManager. Seules les cases qui ont un sens
 * sont cochables ; les autres affichent un tiret.
 */
export function PermissionsMatrix({ value, onToggle, disabled = false }: PermissionsMatrixProps) {
  const t = useTranslations('admin.permissions');

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">{t('matrixCaption')}</caption>
        <thead>
          <tr className="border-b border-[var(--color-border)] text-left text-xs text-[var(--color-muted)]">
            <th scope="col" className="py-2 pr-4 font-semibold">
              {t('columnDomain')}
            </th>
            {PERMISSION_ACTIONS.map((action) => (
              <th key={action} scope="col" className="py-2 px-3 text-center font-semibold">
                {t(`actions.${action}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {DELEGABLE_DOMAINS.map((domain) => (
            <tr key={domain}>
              <th scope="row" className="py-3 pr-4 text-left font-medium">
                {t(`domains.${domain}`)}
              </th>
              {PERMISSION_ACTIONS.map((action) => (
                <td key={action} className="py-3 px-3 text-center">
                  {isDelegable(domain, action) ? (
                    <input
                      type="checkbox"
                      checked={value[domain][action]}
                      disabled={disabled}
                      onChange={(event) => onToggle(domain, action, event.target.checked)}
                      aria-label={`${t(`domains.${domain}`)} — ${t(`actions.${action}`)}`}
                      className="w-4 h-4 accent-[var(--color-primary)]"
                    />
                  ) : (
                    <span aria-label={t('notApplicable')} className="text-[var(--color-muted)]">
                      —
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
