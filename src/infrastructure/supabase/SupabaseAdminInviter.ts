// src/infrastructure/supabase/SupabaseAdminInviter.ts
import { DomainError } from '@/domain/shared/DomainError';
import { EmailType, type EmailProvider } from '@/domain/shared/EmailProvider';
import type { AdminInvitation, AdminInviter } from '@/domain/user/AdminInviter';
import { PermissionSet } from '@/domain/user/PermissionSet';
import { INVITATION_COPY } from '@/infrastructure/email/invitationEmailCopy';
import { createServiceRoleClient } from './serviceRoleClient';

type EmailLocale = 'fr' | 'en' | 'de';

/**
 * Invite un compte via l'API d'administration Supabase (clé service_role,
 * jamais exposée au navigateur) et envoie l'email nous-mêmes : le lien est
 * ainsi localisé et pointe vers notre route `/auth/callback`.
 */
export class SupabaseAdminInviter implements AdminInviter {
  constructor(private readonly emailProvider: EmailProvider) {}

  async invite({ email, fullName, role, locale }: AdminInvitation): Promise<{ id: string }> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { data: { full_name: fullName } },
    });

    if (error || !data.user) {
      if (error && isAlreadyRegistered(error)) {
        throw new DomainError(`Un compte existe déjà pour ${email}.`, 'ADMIN_ALREADY_EXISTS');
      }
      throw new Error(error?.message ?? 'Échec de la génération du lien d\'invitation.');
    }

    const userId = data.user.id;

    // Le profil porte le rôle et les droits : sans lui, le compte ne pourrait pas se connecter au back-office.
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      email,
      full_name: fullName,
      role,
      permissions: PermissionSet.defaults(role).toJSON() as never,
      is_active: true,
    });

    if (profileError) {
      // Évite un compte d'authentification orphelin qui bloquerait toute ré-invitation de cet email.
      await supabase.auth.admin.deleteUser(userId);
      throw new Error(profileError.message);
    }

    await this.sendLink(email, fullName, locale, data.properties.hashed_token, 'invite');
    return { id: userId };
  }

  /**
   * Un lien d'invitation ne peut être régénéré pour un compte déjà créé :
   * on envoie un lien de récupération, qui mène à la même page de choix du mot de passe.
   */
  async resend({ email, fullName, locale }: Omit<AdminInvitation, 'role'>): Promise<void> {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.auth.admin.generateLink({ type: 'recovery', email });
    if (error) throw new Error(error.message);

    await this.sendLink(email, fullName, locale, data.properties.hashed_token, 'reset');
  }

  private async sendLink(
    email: string,
    fullName: string,
    locale: string,
    tokenHash: string,
    purpose: 'invite' | 'reset',
  ): Promise<void> {
    const emailLocale = toEmailLocale(locale);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
    const url = `${baseUrl}/${emailLocale}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&purpose=${purpose}`;

    await this.emailProvider.send({
      to: email,
      subject: INVITATION_COPY[emailLocale].subject,
      type: EmailType.ADMIN_INVITATION,
      data: { fullName, url },
      locale: emailLocale,
    });
  }
}

function toEmailLocale(locale: string): EmailLocale {
  return locale === 'en' || locale === 'de' ? locale : 'fr';
}

function isAlreadyRegistered(error: { code?: string; message: string }): boolean {
  return error.code === 'email_exists' || /already (been )?registered/i.test(error.message);
}
