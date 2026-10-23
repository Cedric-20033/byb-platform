// src/test/fakes/FakeAdminInviter.ts
import type { AdminInvitation, AdminInviter } from '@/domain/user/AdminInviter';

/** Enregistre les invitations sans rien envoyer : les tests vérifient `invited` et `resent`. */
export class FakeAdminInviter implements AdminInviter {
  readonly invited: AdminInvitation[] = [];
  readonly resent: Omit<AdminInvitation, 'role'>[] = [];

  async invite(invitation: AdminInvitation): Promise<{ id: string }> {
    this.invited.push(invitation);
    return { id: `invited-${this.invited.length}` };
  }

  async resend(invitation: Omit<AdminInvitation, 'role'>): Promise<void> {
    this.resent.push(invitation);
  }
}
