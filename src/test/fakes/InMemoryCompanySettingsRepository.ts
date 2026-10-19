// src/test/fakes/InMemoryCompanySettingsRepository.ts
import type { CompanySettings } from '@/domain/settings/CompanySettings';
import type { CompanySettingsRepository } from '@/domain/settings/CompanySettingsRepository';

/** Réglages en mémoire : `null` tant qu'aucun enregistrement n'a eu lieu, comme la base avant le premier `save`. */
export class InMemoryCompanySettingsRepository implements CompanySettingsRepository {
  stored: CompanySettings | null = null;
  saveCount = 0;

  async get(): Promise<CompanySettings | null> {
    return this.stored ? structuredClone(this.stored) : null;
  }

  async save(settings: CompanySettings): Promise<CompanySettings> {
    this.saveCount += 1;
    this.stored = structuredClone(settings);
    return structuredClone(settings);
  }
}
