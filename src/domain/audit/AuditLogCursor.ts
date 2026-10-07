// src/domain/audit/AuditLogCursor.ts

/**
 * Curseur de pagination « keyset » du journal : le couple (created_at, id) de la
 * dernière ligne reçue. Une pagination par OFFSET dériverait dès qu'une ligne est
 * insérée pendant la lecture — fréquent ici, le journal est écrit en continu.
 *
 * `createdAt` reste la CHAÎNE renvoyée par la base : un `Date` JavaScript n'a que la
 * milliseconde alors que Postgres stocke la microseconde, et deux lignes d'une même
 * milliseconde seraient alors sautées ou répétées à la jonction de deux pages.
 */
export type AuditLogCursor = { createdAt: string; id: string };

const TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** PostgREST renvoie « +00:00 », on travaille en « Z » : forme canonique unique, sans « + » à encoder. */
function normalizeTimestamp(value: string): string {
  return value.replace(/\+00:00$/, 'Z');
}

/**
 * Garde stricte, appliquée avant toute construction de requête : les deux valeurs sont
 * ensuite insérées dans un filtre PostgREST `or=(…)`, où une virgule ou une parenthèse
 * glissée dans un curseur forgé changerait la sémantique du filtre.
 */
export function isAuditLogCursor(value: unknown): value is AuditLogCursor {
  if (typeof value !== 'object' || value === null) return false;
  const { createdAt, id } = value as Record<string, unknown>;
  return (
    typeof createdAt === 'string' &&
    TIMESTAMP_PATTERN.test(createdAt) &&
    typeof id === 'string' &&
    UUID_PATTERN.test(id)
  );
}

/** Forme opaque (base64url) transmise au navigateur ; son contenu n'est pas un contrat. */
export function encodeAuditLogCursor(cursor: AuditLogCursor): string {
  const canonical = { createdAt: normalizeTimestamp(cursor.createdAt), id: cursor.id };
  if (!isAuditLogCursor(canonical)) throw new Error('Curseur du journal d\'audit invalide.');

  // Contenu garanti ASCII par la validation ci-dessus : btoa ne peut pas échouer.
  return btoa(JSON.stringify({ t: canonical.createdAt, i: canonical.id }))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** `null` pour toute valeur qui n'est pas un curseur que nous aurions pu émettre. */
export function decodeAuditLogCursor(raw: string): AuditLogCursor | null {
  try {
    const base64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const parsed: unknown = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    if (typeof parsed !== 'object' || parsed === null) return null;

    const { t, i } = parsed as Record<string, unknown>;
    if (typeof t !== 'string' || typeof i !== 'string') return null;

    const candidate = { createdAt: normalizeTimestamp(t), id: i };
    return isAuditLogCursor(candidate) ? candidate : null;
  } catch {
    return null;
  }
}
