// src/application/settings/UpdateCompanySettings.ts
import type { AdminActor } from '@/application/users/AdminActor';
import { AuditAction, type AuditLogger } from '@/domain/shared/AuditLogger';
import type { CompanySettings } from '@/domain/settings/CompanySettings';
import type { CompanySettingsRepository } from '@/domain/settings/CompanySettingsRepository';
import {
  changedSettingsFields,
  normalizeCompanySettings,
  type CompanySettingsInput,
} from '@/domain/settings/CompanySettingsRules';

export type UpdateCompanySettingsInput = AdminActor & { settings: CompanySettingsInput };

/**
 * Use case : enregistre les réglages de l'entreprise.
 *
 * La comparaison se fait avec les réglages EN VIGUEUR (enregistrés, sinon les valeurs de repli) : un premier
 * enregistrement identique au site actuel ne laisse donc aucune trace inutile, mais crée tout de même la ligne.
 * L'audit liste les champs modifiés, jamais leur contenu (emails et téléphones n'ont rien à faire dans le journal).
 */
export class UpdateCompanySettings {
  constructor(
    private readonly settingsRepository: CompanySettingsRepository,
    private readonly auditLogger: AuditLogger,
    private readonly fallback: CompanySettings,
  ) {}

  async execute({ actorId, actorRole, settings }: UpdateCompanySettingsInput): Promise<CompanySettings> {
    const next = normalizeCompanySettings(settings);
    const stored = await this.settingsRepository.get();
    const changedFields = changedSettingsFields(stored ?? this.fallback, next);

    // Rien à changer ET la ligne existe déjà : ni écriture ni trace.
    if (stored && changedFields.length === 0) return stored;

    const saved = await this.settingsRepository.save(next);

    if (changedFields.length > 0) {
      await this.auditLogger.log({
        actorId,
        actorRole,
        action: AuditAction.SETTINGS_UPDATED,
        targetType: 'settings',
        targetId: null,
        metadata: { changedFields },
      });
    }

    return saved;
  }
}
