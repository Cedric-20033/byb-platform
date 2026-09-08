// src/lib/seededRandom.ts

/**
 * Mélange pseudo-aléatoire déterministe (Fisher-Yates + PRNG mulberry32).
 *
 * Utilisé pour choisir "au hasard" quelles photos d'un service apparaissent
 * sur la page d'accueil, sans jamais utiliser Math.random() : un Server
 * Component doit produire exactement la même sortie à chaque requête (sinon
 * le contenu change à chaque refresh, avec un risque de mismatch d'hydratation
 * si le résultat diffère entre serveur et client).
 *
 * Avec la même seed, seededShuffle retourne toujours le même ordre — le
 * tirage ne change donc que si la seed change (ex. l'id du service) ou si
 * le contenu réel change (ajout/suppression de photos), jamais au refresh.
 */

/** Générateur pseudo-aléatoire 32 bits, rapide et suffisant pour du tirage visuel (pas de la crypto). */
function mulberry32(seed: number): () => number {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash simple d'une chaîne en entier 32 bits, utilisé comme seed du PRNG. */
function hashStringToSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Retourne une copie mélangée de `items`, de façon déterministe pour une `seed` donnée.
 * @example seededShuffle(['a', 'b', 'c'], 'service-toiture') // toujours le même ordre pour cette seed
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = [...items];
  const random = mulberry32(hashStringToSeed(seed));

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}
