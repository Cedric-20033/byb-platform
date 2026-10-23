// src/infrastructure/supabase/repositories/postgrestSearch.test.ts
import { describe, expect, it } from 'vitest';
import { buildTextSearchFilter, escapeLikePattern } from './postgrestSearch';

describe('escapeLikePattern', () => {
  it('neutralise les jokers LIKE et l\'échappement', () => {
    expect(escapeLikePattern('50%_a\\b')).toBe('50\\%\\_a\\\\b');
  });

  it('laisse un texte ordinaire intact', () => {
    expect(escapeLikePattern('Alice Martin')).toBe('Alice Martin');
  });
});

describe('buildTextSearchFilter', () => {
  it('cherche le texte dans le nom, l\'email et le téléphone', () => {
    expect(buildTextSearchFilter('alice')).toBe(
      'client_name.ilike."%alice%",client_email.ilike."%alice%",client_phone.ilike."%alice%"',
    );
  });

  it('ignore les espaces autour de la saisie', () => {
    expect(buildTextSearchFilter('  alice ')).toContain('"%alice%"');
  });

  it('ne laisse pas une virgule ouvrir une condition supplémentaire', () => {
    const filter = buildTextSearchFilter('x,status.eq.cancelled');

    // La virgule reste à l'intérieur d'une valeur entre guillemets : seules 3 conditions existent.
    expect(filter.match(/\.ilike\./g)).toHaveLength(3);
    expect(filter).toContain('"%x,status.eq.cancelled%"');
  });

  it('échappe les guillemets et les antislashs de la saisie', () => {
    const filter = buildTextSearchFilter('a"b\\c');

    expect(filter).toContain('"%a\\"b\\\\\\\\c%"');
  });
});
