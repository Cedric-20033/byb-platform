// src/domain/shared/CaptchaVerifier.ts

/**
 * Port de sortie : vérification anti-robot d'un formulaire public (Cloudflare Turnstile aujourd'hui).
 *
 * `token` est la preuve produite par le widget dans le navigateur ; `null` quand le visiteur n'en a
 * pas fourni. Une implémentation désactivée (clé non configurée) accepte tout.
 */
export interface CaptchaVerifier {
  verify(token: string | null, ip: string | null): Promise<boolean>;
}
