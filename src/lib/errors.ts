// src/lib/errors.ts
import { DomainError } from '@/domain/shared/DomainError';

/**
 * Message générique affiché quand une erreur non métier survient — jamais
 * de détail technique (message Postgres, stack, nom de permission interne...).
 */
const DEFAULT_MESSAGE = 'Une erreur est survenue de notre côté. Veuillez réessayer dans un instant, ou nous contacter si le problème persiste.';

/**
 * Message dédié aux refus de permission RBAC — reste générique, ne révèle
 * jamais quel domaine/action précis a été refusé (ex. "appointments.edit"),
 * ce détail n'apporte rien à l'utilisateur et n'a de valeur que côté audit.
 */
export const PERMISSION_DENIED_MESSAGE = "Vous n'avez pas la permission d'effectuer cette action.";

/**
 * Convertit une erreur interceptée dans une Server Action en un message
 * toujours sûr à afficher à l'utilisateur — point de passage unique pour
 * toutes les Server Actions de l'application.
 *
 * - DomainError : message métier déjà rédigé pour être lu par un humain
 *   (ex. "Ce créneau vient d'être réservé...") — affiché tel quel, c'est
 *   précisément à ça que sert cette classe (voir src/domain/shared/DomainError.ts).
 * - Toute autre erreur (bug, panne réseau, erreur Postgres, permission
 *   refusée, etc.) : jamais affichée telle quelle. Le détail technique complet
 *   est journalisé côté serveur (jamais transmis au navigateur), et seulement
 *   en développement — en production, aucun détail n'est loggé nulle part
 *   côté serveur non plus, pour ne pas polluer les logs de prod avec du bruit
 *   attendu (ex. mauvais mot de passe).
 */
export function toUserMessage(error: unknown, fallback: string = DEFAULT_MESSAGE): string {
  if (error instanceof DomainError) {
    return error.message;
  }
  if (process.env.NODE_ENV !== 'production') {
    console.error(error);
  }
  return fallback;
}
