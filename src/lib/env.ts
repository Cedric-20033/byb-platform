// src/lib/env.ts
import { z } from 'zod';

/**
 * Variables d'environnement de l'application, validées au démarrage du serveur (`instrumentation.ts`).
 * Une variable absente ou mal formée fait échouer le démarrage avec un message qui nomme chaque
 * variable fautive, au lieu d'une erreur obscure à la première requête qui en a besoin.
 *
 * Trois niveaux :
 *  - toujours requises : sans elles, rien ne fonctionne (Supabase) ;
 *  - requises en production seulement : un poste de développement peut s'en passer (emails, médias) ;
 *  - optionnelles : le service concerné se désactive proprement (anti-robot).
 */
const text = z.string().trim().optional();

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ error: 'NEXT_PUBLIC_SUPABASE_URL doit être une URL valide' }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY est requise'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1, 'SUPABASE_SERVICE_ROLE_KEY est requise'),

  NEXT_PUBLIC_APP_URL: z.url({ error: 'NEXT_PUBLIC_APP_URL doit être une URL valide' }).optional(),
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: text,
  CLOUDINARY_API_KEY: text,
  CLOUDINARY_API_SECRET: text,
  RESEND_API_KEY: text,

  RESEND_FROM_EMAIL: text,
  TURNSTILE_SECRET_KEY: text,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: text,
});

export type Env = z.infer<typeof schema>;

/** Variables sans lesquelles la production ne peut pas fonctionner (emails, médias, liens des emails). */
const REQUIRED_IN_PRODUCTION = [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'RESEND_API_KEY',
] as const satisfies ReadonlyArray<keyof Env>;

/** Règles qui portent sur plusieurs variables à la fois ; renvoie un message par problème. */
function crossFieldProblems(env: Env, isProduction: boolean): string[] {
  const problems: string[] = [];

  if (isProduction) {
    for (const name of REQUIRED_IN_PRODUCTION) {
      if (!env[name]) problems.push(`${name} est requise en production`);
    }
    // Un lien envoyé par email en http:// exposerait les jetons de rendez-vous.
    if (env.NEXT_PUBLIC_APP_URL && !env.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
      problems.push('NEXT_PUBLIC_APP_URL doit commencer par https:// en production');
    }
  }

  // Les deux clés Turnstile vont ensemble : l'une sans l'autre désactiverait le contrôle côté serveur
  // tout en affichant le widget (ou l'inverse), un état trompeur.
  if (Boolean(env.TURNSTILE_SECRET_KEY) !== Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)) {
    problems.push('TURNSTILE_SECRET_KEY et NEXT_PUBLIC_TURNSTILE_SITE_KEY vont ensemble : définir les deux ou aucune');
  }

  return problems;
}

/**
 * Valide un jeu de variables et lève une erreur listant TOUS les problèmes d'un coup
 * (plutôt que de les révéler un par un à chaque redémarrage). Les valeurs ne figurent jamais dans le message :
 * ce sont des secrets.
 */
export function parseEnv(source: Record<string, string | undefined>, isProduction: boolean): Env {
  const result = schema.safeParse(source);
  const problems = result.success
    ? crossFieldProblems(result.data, isProduction)
    : result.error.issues.map((issue) => {
        const name = issue.path.join('.');
        // Zod 4 n'inclut plus le chemin du champ dans le message pour les types manquants.
        // On l'ajoute explicitement pour que le diagnostic nomme chaque variable absente.
        return name && !issue.message.includes(name) ? `${name}: ${issue.message}` : issue.message;
      });

  if (problems.length > 0) {
    const list = problems.map((problem) => `  - ${problem}`).join('\n');
    throw new Error(`Configuration invalide : variables d'environnement manquantes ou incorrectes.\n${list}`);
  }
  return (result as { data: Env }).data;
}

/** Valide `process.env` ; appelé une fois au démarrage du serveur. */
export function validateEnv(): Env {
  return parseEnv(process.env, process.env.NODE_ENV === 'production');
}
