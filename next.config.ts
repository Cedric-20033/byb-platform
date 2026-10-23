// next.config.ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/**
 * Plugin next-intl : connecte automatiquement la configuration i18n
 * définie dans src/lib/i18n.ts à Next.js App Router.
 */
const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts');

const isProduction = process.env.NODE_ENV === 'production';

/** Origine d'une URL d'environnement, ou `null` si elle est absente ou invalide (la config ne doit jamais planter). */
function originOf(value: string | undefined): string | null {
  try {
    return value ? new URL(value).origin : null;
  } catch {
    return null;
  }
}

const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const appHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).host : null;
  } catch {
    return null;
  }
})();

/**
 * Content-Security-Policy : liste blanche des seules origines dont le site a besoin.
 *  - Cloudflare Turnstile (anti-robot) : script et cadre.
 *  - Cloudinary : images et vidéos des réalisations.
 *  - Supabase : requêtes API et temps réel (WebSocket) du dashboard.
 *  - Google Maps : cadre intégré, uniquement après le clic de consentement (`ConsentMap`).
 * `'unsafe-inline'` reste nécessaire pour les scripts et styles injectés par Next.js et next-themes ; une politique
 * à nonce (via `proxy.ts`) supprimerait cette concession mais impose le rendu dynamique de toutes les pages.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "media-src 'self' blob: https://res.cloudinary.com",
  "font-src 'self' data:",
  `connect-src 'self' https://challenges.cloudflare.com ${supabaseOrigin ?? ''} ${
    supabaseOrigin ? supabaseOrigin.replace('https://', 'wss://') : ''
  }`.trim(),
  'frame-src https://challenges.cloudflare.com https://www.google.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
]
  .join('; ')
  .replace(/\s{2,}/g, ' ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Aucune fonction matérielle n'est utilisée par le site : on les interdit, y compris aux cadres intégrés.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  // Les cartes et le widget anti-robot s'ouvrent dans des cadres : l'isolation d'origine reste donc partielle.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // En développement : pas de CSP (le rechargement à chaud utilise `eval` et des WebSockets locaux) ni de HSTS (http).
  ...(isProduction
    ? [
        { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        // Deux ans, sous-domaines inclus. Pas de `preload` : engagement irréversible, à décider avec le client.
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      ]
    : []),
];

const nextConfig: NextConfig = {
  output: "standalone",

  // Ne pas annoncer la technologie du serveur dans chaque réponse.
  poweredByHeader: false,

  experimental: {
    serverActions: {
      // Next.js refuse déjà toute action dont l'origine diffère de l'hôte (protection CSRF). Derrière un reverse proxy,
      // l'hôte vu par Next peut différer du domaine public : on autorise explicitement ce dernier, et lui seul.
      allowedOrigins: appHost ? [appHost] : [],
    },
  },

  images: {
    // AVIF d'abord (30 à 50 % plus léger que WebP), WebP en repli : réduit le poids des photos de chantier.
    formats: ['image/avif', 'image/webp'],
    // Les médias sont versionnés par leur public_id : un cache d'un mois est sûr et évite des ré-optimisations.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    // Domaines autorisés pour next/image 
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com', 
      },
    ],
  },

  async headers() {
    return [
      {
        // Photos du dossier /public : rarement modifiées, mises en cache une semaine (revalidation en arrière-plan ensuite).
        source: '/Images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' }],
      },
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
