// src/application/audit/RecordAuthEvent.ts
import { AuditAction, type ActorRole, type AuditLogger } from '@/domain/shared/AuditLogger';

/** Événements de session et de sécurité du compte, hors CRUD métier. */
export type AuthEvent = 'login' | 'logout' | 'login_failed' | 'password_changed';

const ACTION_BY_EVENT: Record<AuthEvent, AuditAction> = {
  login: AuditAction.AUTH_LOGIN,
  logout: AuditAction.AUTH_LOGOUT,
  login_failed: AuditAction.AUTH_LOGIN_FAILED,
  password_changed: AuditAction.AUTH_PASSWORD_CHANGED,
};

export type RecordAuthEventInput = {
  event: AuthEvent;
  /** `null` quand aucune identité n'est établie (identifiants inconnus). */
  actorId: string | null;
  actorRole: ActorRole;
  metadata?: Record<string, unknown>;
};

/**
 * Use case : trace un événement d'authentification.
 * La cible est le compte concerné (`targetType: 'auth'`), ce qui permet de retrouver
 * toute l'activité d'un compte en filtrant sur son identifiant.
 */
export class RecordAuthEvent {
  constructor(private readonly auditLogger: AuditLogger) {}

  async execute({ event, actorId, actorRole, metadata }: RecordAuthEventInput): Promise<void> {
    await this.auditLogger.log({
      actorId,
      actorRole,
      action: ACTION_BY_EVENT[event],
      targetType: 'auth',
      targetId: actorId,
      metadata,
    });
  }
}
