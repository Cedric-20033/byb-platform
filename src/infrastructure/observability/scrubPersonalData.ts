// src/infrastructure/observability/scrubPersonalData.ts

/**
 * Masquage des données personnelles et des secrets avant tout envoi vers un outil de supervision (RGPD).
 * Les messages d'erreur en contiennent souvent sans qu'on y pense : une contrainte Postgres cite l'email en
 * conflit (« Key (email)=(x@y.be) already exists »), une URL d'annulation contient le jeton du rendez-vous.
 *
 * L'ordre compte : les motifs les plus spécifiques (JWT, jeton d'URL) passent avant les plus généraux.
 */
const RULES: ReadonlyArray<[pattern: RegExp, replacement: string]> = [
  [/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[jwt]'],
  [/Bearer\s+[\w.~+/-]+=*/gi, 'Bearer [token]'],
  // Le jeton de rendez-vous est le seul secret qui protège le rendez-vous d'un client.
  [/(\/rdv\/(?:annuler|modifier)\/)[^\s/?#"']+/g, '$1[token]'],
  [/(api[_-]?key|secret|password|token)(["']?\s*[:=]\s*["']?)[^\s"',}&]+/gi, '$1$2[redacted]'],
  [/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]'],
  // Numéros internationaux (+32…, 0032…) et mobiles belges (04xx xx xx xx) ; les dates et identifiants ne sont pas touchés.
  [/(?:\+|00)\d[\d\s().-]{7,}\d/g, '[phone]'],
  [/\b04\d{2}[\s./-]?\d{2}[\s./-]?\d{2}[\s./-]?\d{2}\b/g, '[phone]'],
];

export function scrubText(text: string): string {
  return RULES.reduce((current, [pattern, replacement]) => current.replace(pattern, replacement), text);
}

/** Erreur réduite à des champs textuels masqués : l'objet d'origine peut porter des données (requête, corps de réponse). */
export type ScrubbedError = { name: string; message: string; stack?: string; digest?: string };

export function scrubError(error: unknown): ScrubbedError {
  if (error instanceof Error) {
    const digest = (error as { digest?: unknown }).digest;
    return {
      name: error.name,
      message: scrubText(error.message),
      stack: error.stack ? scrubText(error.stack) : undefined,
      // Le digest identifie l'erreur côté serveur sans en révéler le contenu : il est conservé tel quel.
      digest: typeof digest === 'string' ? digest : undefined,
    };
  }
  return { name: 'NonError', message: scrubText(typeof error === 'string' ? error : String(error)) };
}

/** Étiquettes masquées : une valeur saisie par un visiteur ne doit jamais s'y glisser. */
export function scrubTags(tags: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!tags) return undefined;
  return Object.fromEntries(Object.entries(tags).map(([key, value]) => [key, scrubText(value)]));
}
