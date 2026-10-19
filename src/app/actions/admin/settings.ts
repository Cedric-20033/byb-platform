'use server';

// src/app/actions/admin/settings.ts
import { GetCompanySettings } from '@/application/settings/GetCompanySettings';
import { UpdateCompanySettings } from '@/application/settings/UpdateCompanySettings';
import type { CompanySettings } from '@/domain/settings/CompanySettings';
import { assertPermission, getCurrentAdmin, toActorRole } from '@/lib/auth/getCurrentAdmin';
import { revalidateSettings } from '@/lib/cache/revalidateSettings';
import { failure, toErrorCode, type ActionFailure } from '@/lib/errors';
import { createSettingsDeps } from '@/lib/settings/settingsComposition';
import { companySettingsSchema } from '@/lib/validation/settings';

/**
 * Server Actions des réglages de l'entreprise. Mutation : Zod → getCurrentAdmin → assertPermission →
 * use case → revalidation du site public. Droits alignés sur la RLS de 0022 : lire = settings.view,
 * enregistrer = settings.edit.
 */
type SettingsResult = { success: true; settings: CompanySettings } | ActionFailure;

export async function getCompanySettingsAction(): Promise<SettingsResult> {
  try {
    assertPermission(await getCurrentAdmin(), 'settings', 'view');

    const deps = await createSettingsDeps();
    return { success: true, settings: await new GetCompanySettings(deps.settings, deps.fallback).execute() };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}

export async function updateCompanySettingsAction(input: unknown): Promise<SettingsResult> {
  try {
    const parsed = companySettingsSchema.safeParse(input);
    if (!parsed.success) return failure('VALIDATION_FAILED');

    const admin = await getCurrentAdmin();
    assertPermission(admin, 'settings', 'edit');

    const deps = await createSettingsDeps();
    const settings = await new UpdateCompanySettings(deps.settings, deps.audit, deps.fallback).execute({
      settings: parsed.data,
      actorId: admin.id,
      actorRole: toActorRole(admin.role),
    });

    revalidateSettings();
    return { success: true, settings };
  } catch (error) {
    return failure(toErrorCode(error));
  }
}
