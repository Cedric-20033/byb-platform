// src/domain/settings/CompanySettingsRepository.ts
import type { CompanySettings } from './CompanySettings';

/** Port de lecture/écriture des réglages (une seule instance). */
export interface CompanySettingsRepository {
  /** Les réglages enregistrés, ou `null` tant que personne ne les a enregistrés. */
  get(): Promise<CompanySettings | null>;
  /** Crée ou remplace l'unique ligne de réglages. */
  save(settings: CompanySettings): Promise<CompanySettings>;
}
