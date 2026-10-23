// src/domain/user/AdminInviter.ts
import type { UserRole } from './UserRole';

export type AdminInvitation = {
  email: string;
  fullName: string;
  role: UserRole;
  /** Langue de l'email et de la page d'activation. */
  locale: string;
};

/**
 * Port de sortie : invitation d'un nouveau compte par email.
 * Séparé d'`AdminRepository` (ISP) : créer un compte d'authentification et
 * lire/modifier des profils sont deux responsabilités, deux adaptateurs.
 */
export interface AdminInviter {
  /** Crée le compte et envoie le lien d'activation. Lève `ADMIN_ALREADY_EXISTS` si l'email est déjà pris. */
  invite(invitation: AdminInvitation): Promise<{ id: string }>;
  /** Génère et envoie un nouveau lien à un compte qui n'a pas encore défini son mot de passe. */
  resend(invitation: Omit<AdminInvitation, 'role'>): Promise<void>;
}
