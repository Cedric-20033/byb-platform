// src/infrastructure/http/getClientIp.ts
import { isIP } from 'node:net';
import { headers } from 'next/headers';

/**
 * Adresse IP du client, lue dans les en-têtes posés par le reverse proxy.
 *
 * `x-forwarded-for` peut contenir une chaîne « client, proxy1, proxy2 » : seule
 * la première valeur est le client. Le contenu est validé comme une vraie
 * adresse IP, car l'en-tête est une saisie arbitraire tant qu'aucun proxy de
 * confiance ne le réécrit (c'est le cas chez les hébergeurs visés : AWS, Azure, OVH).
 */
export async function getClientIp(): Promise<string | null> {
  const requestHeaders = await headers();

  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded && isIP(forwarded)) return forwarded;

  const real = requestHeaders.get('x-real-ip')?.trim();
  return real && isIP(real) ? real : null;
}
