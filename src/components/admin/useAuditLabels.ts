// src/components/admin/useAuditLabels.ts
'use client';

import { useTranslations } from 'next-intl';
import type { MetadataScalar } from '@/components/admin/auditMetadata';
import type { AuditLogEntry } from '@/domain/audit/AuditLogEntry';
import { ActorRole } from '@/domain/shared/AuditLogger';

type ActorFields = Pick<AuditLogEntry, 'actorId' | 'actorName' | 'actorEmail' | 'actorRole'>;

/**
 * Libellés traduits du journal d'audit, partagés par le tableau, la boîte de détail et l'export.
 *
 * Les colonnes `action` et `target_type` sont du texte libre en base : un code que cette version
 * du code ne connaît plus (action retirée) doit rester affichable, d'où le repli sur la valeur brute.
 */
export function useAuditLabels() {
  const t = useTranslations('admin.auditLogs');

  return {
    action: (code: string) => (t.has(`actions.${code}`) ? t(`actions.${code}`) : code),
    targetType: (type: string) => (t.has(`targetTypes.${type}`) ? t(`targetTypes.${type}`) : type),
    role: (role: ActorRole) => t(`actorRoles.${role}`),

    /** Valeur de métadonnée : les booléens et les valeurs vides sont traduits, le reste est affiché tel qu'enregistré. */
    scalar: (value: MetadataScalar) => {
      if (value === null || value === '') return t('details.emptyList');
      if (typeof value === 'boolean') return t(value ? 'details.yes' : 'details.no');
      return String(value);
    },

    /**
     * Nom lisible de l'auteur. Le profil n'est lisible que du superadmin (RLS) : pour un admin,
     * `actorName`/`actorEmail` peuvent être vides alors que l'auteur existe encore.
     */
    actor: ({ actorId, actorName, actorEmail, actorRole }: ActorFields) => {
      const name = actorName || actorEmail;
      if (name) return name;
      if (actorId) return t('unknownActor');
      return actorRole === ActorRole.CLIENT ? t('anonymousActor') : t('systemActor');
    },
  };
}
