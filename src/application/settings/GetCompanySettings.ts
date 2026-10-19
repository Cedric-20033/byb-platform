// src/application/settings/GetCompanySettings.ts
import type { CompanySettings } from '@/domain/settings/CompanySettings';
import type { CompanySettingsRepository } from '@/domain/settings/CompanySettingsRepository';

/**
 * Use case (lecture seule) : les réglages à appliquer. Tant que rien n'est enregistré, ce sont les valeurs
 * de repli fournies par la composition (les données actuelles du site) : le site fonctionne dès le premier
 * jour, sans amorçage de la base.
 */
export class GetCompanySettings {
  constructor(
    private readonly settingsRepository: CompanySettingsRepository,
    private readonly fallback: CompanySettings,
  ) {}

  async execute(): Promise<CompanySettings> {
    return (await this.settingsRepository.get()) ?? this.fallback;
  }
}
