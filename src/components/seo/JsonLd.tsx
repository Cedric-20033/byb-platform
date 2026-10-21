// src/components/seo/JsonLd.tsx
import { serializeJsonLd } from '@/lib/seo/structuredData';

/** Balise de données structurées, rendue côté serveur : aucun JavaScript client n'est nécessaire. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
