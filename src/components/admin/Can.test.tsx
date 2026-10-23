// @vitest-environment jsdom
// src/components/admin/Can.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { PermissionGrid } from '@/domain/user/PermissionCatalog';
import { PermissionSet } from '@/domain/user/PermissionSet';
import { Can } from './Can';
import { PermissionsProvider, usePermissions } from './PermissionsProvider';

const defaults: PermissionGrid = PermissionSet.defaults().toJSON();

function renderCan(role: 'admin' | 'superadmin', grid: PermissionGrid = defaults) {
  return render(
    <PermissionsProvider role={role} permissions={grid}>
      <Can domain="services" action="create" fallback={<span>refusé</span>}>
        <button>Créer un service</button>
      </Can>
    </PermissionsProvider>,
  );
}

describe('<Can>', () => {
  it("masque le contenu et affiche le repli quand l'admin n'a pas le droit", () => {
    renderCan('admin');

    expect(screen.queryByRole('button', { name: 'Créer un service' })).not.toBeInTheDocument();
    expect(screen.getByText('refusé')).toBeInTheDocument();
  });

  it("affiche le contenu quand l'admin a le droit accordé", () => {
    renderCan('admin', PermissionSet.defaults().with('services', 'create', true).toJSON());

    expect(screen.getByRole('button', { name: 'Créer un service' })).toBeInTheDocument();
  });

  it('affiche toujours le contenu au superadmin', () => {
    renderCan('superadmin');

    expect(screen.getByRole('button', { name: 'Créer un service' })).toBeInTheDocument();
  });
});

describe('usePermissions', () => {
  it('lève une erreur explicite hors du provider', () => {
    function Probe() {
      usePermissions();
      return null;
    }

    expect(() => render(<Probe />)).toThrow(/PermissionsProvider/);
  });
});
