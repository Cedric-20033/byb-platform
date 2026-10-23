// src/application/users/AdminActor.ts
import type { ActorRole } from '@/domain/shared/AuditLogger';

/** Identité de l'auteur d'une action, transmise par la Server Action au use case pour l'audit et les garde-fous. */
export type AdminActor = {
  actorId: string;
  actorRole: ActorRole;
};
