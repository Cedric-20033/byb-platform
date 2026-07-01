// next.config.ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/**
 * Plugin next-intl : connecte automatiquement la configuration i18n
 * définie dans src/lib/i18n.ts à Next.js App Router.
 */
const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts');

const nextConfig: NextConfig = {
  output: "standalone",
  
  images: {
    // Domaines autorisés pour next/image 
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com', 
      },
    ],
  },

  // En production, les headers de sécurité sont gérés ici
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);