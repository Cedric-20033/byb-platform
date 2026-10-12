// src/infrastructure/supabase/repositories/postgrestSearch.ts

/** Colonnes de `appointments` parcourues par la recherche texte. */
const SEARCHABLE_COLUMNS = ['client_name', 'client_email', 'client_phone'] as const;

/**
 * Neutralise les jokers de `LIKE` (`%`, `_`) et le caractère d'échappement lui-même :
 * la saisie de l'admin est un texte à retrouver tel quel, pas un motif.
 */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

/**
 * Construit l'argument de `.or()` pour une recherche texte « contient » insensible à la casse.
 *
 * Le texte vient d'un formulaire : sans précaution, une virgule ou une parenthèse y serait lue par
 * PostgREST comme un séparateur de conditions, et l'utilisateur pourrait ajouter ses propres filtres
 * (`x,status.eq.cancelled`). La valeur est donc placée entre guillemets, avec guillemets et
 * antislashs échappés comme l'exige la syntaxe PostgREST.
 */
export function buildTextSearchFilter(text: string): string {
  const pattern = `%${escapeLikePattern(text.trim())}%`;
  const quoted = `"${pattern.replace(/["\\]/g, '\\$&')}"`;
  return SEARCHABLE_COLUMNS.map((column) => `${column}.ilike.${quoted}`).join(',');
}
