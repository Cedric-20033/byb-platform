// src/app/[locale]/not-found.tsx
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { getLocalizedPath } from '@/lib/routing';
import type {Locale} from '@/lib/routing';

// Clés fr.json : errors.notFound, errors.notFoundDescription, errors.backHome
export default function NotFound() {
  const locale = useLocale() as Locale;
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 px-4">
        <p className="font-[var(--font-display)] font-black text-9xl text-[var(--color-primary)]/20">404</p>
        <h1 className="text-4xl font-[var(--font-display)] font-black">Page introuvable</h1>
        <p className="text-[var(--color-muted)] max-w-sm mx-auto">
          La page que vous cherchez n&rsquo;existe pas ou a été déplacée.
        </p>
        <Link href={getLocalizedPath('/', locale)}><Button>Retour à l&rsquo;accueil</Button></Link>
      </div>
    </div>
  );
}