// src/components/admin/settings/SettingsEditor.tsx
'use client';

import { useTranslations } from 'next-intl';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { SettingsForm } from './SettingsForm';
import { useCompanySettings } from './settingsQuery';

/** Charge les réglages en vigueur puis affiche le formulaire. */
export function SettingsEditor() {
  const t = useTranslations('admin.settings');
  const errorMessage = useErrorMessage();
  const settingsQuery = useCompanySettings();

  if (settingsQuery.isLoading) {
    return <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('loading')}</p>;
  }
  if (settingsQuery.isError || !settingsQuery.data) {
    return <p className="text-sm text-[var(--color-secondary)] text-center py-6">{errorMessage(settingsQuery.error)}</p>;
  }

  return <SettingsForm settings={settingsQuery.data} />;
}
