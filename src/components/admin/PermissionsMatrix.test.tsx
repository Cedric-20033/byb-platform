// @vitest-environment jsdom
// src/components/admin/PermissionsMatrix.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_ADMIN_PERMISSIONS } from '@/domain/user/PermissionCatalog';
import { PermissionsMatrix } from './PermissionsMatrix';

const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'fr.json'), 'utf8'));

function renderMatrix(onToggle = vi.fn(), disabled = false) {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <PermissionsMatrix value={DEFAULT_ADMIN_PERMISSIONS} onToggle={onToggle} disabled={disabled} />
    </NextIntlClientProvider>,
  );
  return onToggle;
}

describe('PermissionsMatrix', () => {
  it('reflète la grille : cases cochées selon les valeurs', () => {
    renderMatrix();

    expect((screen.getByLabelText('Rendez-vous — Exporter') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Services — Créer') as HTMLInputElement).checked).toBe(false);
  });

  it('n\'affiche aucune case pour le domaine utilisateurs ni pour une action sans objet', () => {
    renderMatrix();

    expect(screen.queryByLabelText(/Utilisateurs/)).toBeNull();
    expect(screen.queryByLabelText('Créneaux — Exporter')).toBeNull();
  });

  it('signale le changement de case avec le domaine, l\'action et la nouvelle valeur', async () => {
    const onToggle = renderMatrix();

    await userEvent.setup().click(screen.getByLabelText('Services — Créer'));

    expect(onToggle).toHaveBeenCalledWith('services', 'create', true);
  });

  it('désactive toutes les cases pendant un enregistrement', () => {
    renderMatrix(vi.fn(), true);

    expect((screen.getByLabelText('Services — Créer') as HTMLInputElement).disabled).toBe(true);
  });
});
