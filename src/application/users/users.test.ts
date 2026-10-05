// src/application/users/users.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { ActorRole, AuditAction } from '@/domain/shared/AuditLogger';
import { USER_ROLES } from '@/domain/user/UserRole';
import { FakeAuditLogger } from '@/test/fakes/FakeAuditLogger';
import { FakeAdminInviter } from '@/test/fakes/FakeAdminInviter';
import { InMemoryAdminRepository, buildAdminProfile } from '@/test/fakes/InMemoryAdminRepository';
import { ChangeAdminRole } from './ChangeAdminRole';
import { DeactivateAdmin, ReactivateAdmin } from './SetAdminActive';
import { InviteAdmin } from './InviteAdmin';
import { ResendInvitation } from './ResendInvitation';

const actor = { actorId: 'super-1', actorRole: ActorRole.SUPERADMIN };

describe('gestion des utilisateurs', () => {
  let repository: InMemoryAdminRepository;
  let audit: FakeAuditLogger;
  let inviter: FakeAdminInviter;

  beforeEach(() => {
    repository = new InMemoryAdminRepository([
      buildAdminProfile({ id: 'super-1', email: 'boss@example.com', role: USER_ROLES.SUPERADMIN }),
      buildAdminProfile({ id: 'admin-1', email: 'admin@example.com' }),
    ]);
    audit = new FakeAuditLogger();
    inviter = new FakeAdminInviter();
  });

  describe('InviteAdmin', () => {
    it('invite un nouvel admin avec un email normalisé et trace l\'action', async () => {
      const { id } = await new InviteAdmin(repository, inviter, audit).execute({
        ...actor, email: '  New@Example.com ', fullName: ' Nouveau ', role: USER_ROLES.ADMIN, locale: 'fr',
      });

      expect(inviter.invited[0]).toMatchObject({ email: 'new@example.com', fullName: 'Nouveau' });
      expect(audit.entries[0]).toMatchObject({ action: AuditAction.USER_INVITED, targetId: id });
    });

    it('refuse un email déjà utilisé, quelle que soit la casse', async () => {
      await expect(
        new InviteAdmin(repository, inviter, audit).execute({
          ...actor, email: 'ADMIN@example.com', fullName: 'Doublon', role: USER_ROLES.ADMIN, locale: 'fr',
        }),
      ).rejects.toMatchObject({ code: 'ADMIN_ALREADY_EXISTS' });
      expect(inviter.invited).toHaveLength(0);
    });
  });

  describe('DeactivateAdmin / ReactivateAdmin', () => {
    it('désactive puis réactive un admin', async () => {
      const off = await new DeactivateAdmin(repository, audit).execute({ ...actor, adminId: 'admin-1' });
      expect(off.isActive).toBe(false);
      expect(off.can('appointments', 'view')).toBe(false);

      const on = await new ReactivateAdmin(repository, audit).execute({ ...actor, adminId: 'admin-1' });
      expect(on.isActive).toBe(true);
      expect(audit.entries.map((e) => e.action)).toEqual([AuditAction.USER_DEACTIVATED, AuditAction.USER_REACTIVATED]);
    });

    it('refuse de se désactiver soi-même', async () => {
      await expect(new DeactivateAdmin(repository, audit).execute({ ...actor, adminId: 'super-1' })).rejects.toMatchObject({
        code: 'CANNOT_MODIFY_SELF',
      });
    });

    it('refuse de désactiver le dernier superadmin actif', async () => {
      const lone = new InMemoryAdminRepository([
        buildAdminProfile({ id: 'super-2', role: USER_ROLES.SUPERADMIN }),
        buildAdminProfile({ id: 'super-1', email: 'boss@example.com', role: USER_ROLES.SUPERADMIN, isActive: false }),
      ]);
      await expect(
        new DeactivateAdmin(lone, audit).execute({ actorId: 'other', actorRole: ActorRole.SUPERADMIN, adminId: 'super-2' }),
      ).rejects.toMatchObject({ code: 'LAST_SUPERADMIN' });
    });

    it('signale un compte introuvable', async () => {
      await expect(new DeactivateAdmin(repository, audit).execute({ ...actor, adminId: 'ghost' })).rejects.toMatchObject({
        code: 'ADMIN_NOT_FOUND',
      });
    });
  });

  describe('ChangeAdminRole', () => {
    it('promeut un admin en superadmin', async () => {
      const updated = await new ChangeAdminRole(repository, audit).execute({ ...actor, adminId: 'admin-1', role: USER_ROLES.SUPERADMIN });
      expect(updated.isSuperadmin).toBe(true);
      expect(audit.entries[0]).toMatchObject({ action: AuditAction.USER_ROLE_UPDATED, metadata: { from: 'admin', to: 'superadmin' } });
    });

    it('refuse de changer son propre rôle', async () => {
      await expect(
        new ChangeAdminRole(repository, audit).execute({ ...actor, adminId: 'super-1', role: USER_ROLES.ADMIN }),
      ).rejects.toMatchObject({ code: 'CANNOT_MODIFY_SELF' });
    });

    it('refuse de rétrograder le dernier superadmin', async () => {
      await expect(
        new ChangeAdminRole(repository, audit).execute({ actorId: 'other', actorRole: ActorRole.SUPERADMIN, adminId: 'super-1', role: USER_ROLES.ADMIN }),
      ).rejects.toMatchObject({ code: 'LAST_SUPERADMIN' });
    });
  });

  describe('ResendInvitation', () => {
    it('renvoie le lien et trace l\'action', async () => {
      await new ResendInvitation(repository, inviter, audit).execute({ ...actor, adminId: 'admin-1', locale: 'en' });
      expect(inviter.resent[0]).toMatchObject({ email: 'admin@example.com', locale: 'en' });
      expect(audit.entries[0].action).toBe(AuditAction.USER_INVITATION_RESENT);
    });
  });
});
