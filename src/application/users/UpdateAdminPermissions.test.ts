// src/application/users/UpdateAdminPermissions.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { DEFAULT_ADMIN_PERMISSIONS, buildPresetGrid } from '@/domain/user/PermissionCatalog';
import { USER_ROLES } from '@/domain/user/UserRole';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { InMemoryAdminRepository, buildAdminProfile } from '@/test/fakes/InMemoryAdminRepository';
import { UpdateAdminPermissions } from './UpdateAdminPermissions';

const actor = { actorId: 'super-1', actorRole: ActorRole.SUPERADMIN };

describe('UpdateAdminPermissions', () => {
  let repository: InMemoryAdminRepository;
  let audit: FakeAuditLogger;
  let useCase: UpdateAdminPermissions;

  beforeEach(() => {
    repository = new InMemoryAdminRepository([
      buildAdminProfile({ id: 'super-1', email: 'boss@example.com', role: USER_ROLES.SUPERADMIN }),
      buildAdminProfile({ id: 'admin-1', email: 'admin@example.com' }),
    ]);
    audit = new FakeAuditLogger();
    useCase = new UpdateAdminPermissions(repository, audit);
  });

  it('applique la grille et trace le diff avant/après', async () => {
    const permissions = structuredClone(DEFAULT_ADMIN_PERMISSIONS);
    permissions.services.create = true;

    const { admin, changes } = await useCase.execute({ ...actor, adminId: 'admin-1', permissions });

    expect(admin.can('services', 'create')).toBe(true);
    expect(changes).toEqual([{ domain: 'services', action: 'create', from: false, to: true }]);
    expect(audit.entries).toHaveLength(1);
    expect(audit.entries[0]).toMatchObject({
      action: AuditAction.USER_PERMISSIONS_UPDATED,
      targetId: 'admin-1',
      metadata: { changes },
    });
  });

  it('applique un preset complet', async () => {
    const { admin } = await useCase.execute({ ...actor, adminId: 'admin-1', permissions: buildPresetGrid('manager') });

    expect(admin.can('slots', 'delete')).toBe(true);
    expect(admin.can('audit_logs', 'view')).toBe(false);
  });

  it('n\'écrit rien et ne journalise rien quand la grille est inchangée', async () => {
    const { changes } = await useCase.execute({ ...actor, adminId: 'admin-1', permissions: DEFAULT_ADMIN_PERMISSIONS });

    expect(changes).toEqual([]);
    expect(audit.entries).toHaveLength(0);
  });

  it('refuse de modifier les droits d\'un superadmin', async () => {
    await expect(
      useCase.execute({ ...actor, adminId: 'super-1', permissions: DEFAULT_ADMIN_PERMISSIONS }),
    ).rejects.toMatchObject({ code: 'SUPERADMIN_NOT_EDITABLE' });
  });

  it('ignore une tentative d\'accorder des droits sur les utilisateurs', async () => {
    const permissions = structuredClone(DEFAULT_ADMIN_PERMISSIONS);
    permissions.users.edit = true;

    const { admin, changes } = await useCase.execute({ ...actor, adminId: 'admin-1', permissions });

    expect(admin.permissions.toJSON().users.edit).toBe(false);
    expect(changes).toEqual([]);
  });

  it('signale un compte introuvable', async () => {
    await expect(
      useCase.execute({ ...actor, adminId: 'ghost', permissions: DEFAULT_ADMIN_PERMISSIONS }),
    ).rejects.toMatchObject({ code: 'ADMIN_NOT_FOUND' });
  });
});
