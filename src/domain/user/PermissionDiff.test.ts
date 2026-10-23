// src/domain/user/PermissionDiff.test.ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ADMIN_PERMISSIONS,
  PERMISSION_DOMAINS,
  buildPresetGrid,
  isDelegable,
  PERMISSION_PRESET_IDS,
} from './PermissionCatalog';
import { diffPermissions, restrictToDelegable } from './PermissionDiff';

describe('diffPermissions', () => {
  it('ne renvoie rien pour deux grilles identiques', () => {
    expect(diffPermissions(DEFAULT_ADMIN_PERMISSIONS, structuredClone(DEFAULT_ADMIN_PERMISSIONS))).toEqual([]);
  });

  it('liste chaque case modifiée avec son avant/après', () => {
    const after = structuredClone(DEFAULT_ADMIN_PERMISSIONS);
    after.services.create = true;
    after.appointments.export = false;

    expect(diffPermissions(DEFAULT_ADMIN_PERMISSIONS, after)).toEqual([
      { domain: 'appointments', action: 'export', from: true, to: false },
      { domain: 'services', action: 'create', from: false, to: true },
    ]);
  });
});

describe('restrictToDelegable', () => {
  it('ignore les cases du domaine users et les actions sans objet', () => {
    const requested = structuredClone(DEFAULT_ADMIN_PERMISSIONS);
    requested.users.edit = true;
    requested.slots.export = true;
    requested.services.create = true;

    const result = restrictToDelegable(DEFAULT_ADMIN_PERMISSIONS, requested);

    expect(result.users.edit).toBe(false);
    expect(result.slots.export).toBe(false);
    expect(result.services.create).toBe(true);
  });
});

describe('presets', () => {
  it('« standard » est exactement la grille par défaut', () => {
    expect(buildPresetGrid('standard')).toEqual(DEFAULT_ADMIN_PERMISSIONS);
  });

  it('« lecture seule » n\'accorde que des droits de consultation', () => {
    const grid = buildPresetGrid('readOnly');
    const granted = PERMISSION_DOMAINS.flatMap((d) => Object.entries(grid[d]).filter(([, v]) => v).map(([a]) => a));

    expect(granted.length).toBeGreaterThan(0);
    expect(new Set(granted)).toEqual(new Set(['view']));
  });

  it.each(PERMISSION_PRESET_IDS)('« %s » n\'accorde jamais de case non délégable ni le journal d\'audit', (preset) => {
    const grid = buildPresetGrid(preset);
    for (const domain of PERMISSION_DOMAINS) {
      for (const [action, value] of Object.entries(grid[domain])) {
        if (value) expect(isDelegable(domain, action as 'view')).toBe(true);
      }
    }
    expect(Object.values(grid.audit_logs).some(Boolean)).toBe(false);
  });
});
