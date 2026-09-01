import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import {
  ArrowRight,
  Home,
  Triangle,
  PanelsTopLeft,
  Layers,
  Building,
  Paintbrush,
  Grid3x3,
  Sun,
  Flame,
} from "lucide-react";
import { t } from "@/lib/utils";
import { getLocalizedPath } from "@/lib/routing";
import type { Locale } from "@/lib/routing";
import type { Service } from "@/types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { LucideIcon } from "lucide-react";

// Une entrée par icône référencée dans data/services.ts (champ `icon`).
// Ajouter ici toute nouvelle icône utilisée lors de la création d'un service.
const ICONS: Record<string, LucideIcon> = {
  Home,
  Triangle,
  PanelsTopLeft,
  Layers,
  Building,
  Paintbrush,
  Grid3x3,
  Sun,
  Flame,
}

type ServicesSectionProps = {
  /** Services actifs, triés par ordre — fournis par la page Server Component (Supabase). */
  services: Service[];
  /**
   * Nombre maximum de services à afficher (ex. sur la page d'accueil).
   * Si omis, tous les services reçus sont affichés (ex. page /services).
   */
  limit?: number;
};

/**
 * Grille des services — utilisée sur la page d'accueil.
 *
 * Architecture hexagonale : ce composant ne connaît aucune source de
 * données — il reçoit `services` en props depuis un Server Component
 * (aujourd'hui SupabaseServiceRepository). Le composant ne change jamais,
 * quelle que soit l'origine des données.
 *
 * Clés fr.json : home.services.eyebrow, home.services.title, home.services.cta
 *                common.learnMore
 */
export function ServicesSection({ services: allServices, limit }: ServicesSectionProps) {
  const tSection = useTranslations("home.services");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;

  // On ne tronque qu'à l'affichage : `allServices` reste la source complète
  // et triée, réutilisable telle quelle sur la page /services.
  const services = limit ? allServices.slice(0, limit) : allServices;

  return (
    <section className="section-padding bg-[var(--color-background)]">
      <div className="container-custom">
        <div className="text-center mb-14">
          <p className="eyebrow mb-3">{tSection("eyebrow")}</p>
          <h2 className="text-4xl lg:text-5xl font-[var(--font-display)] font-black">
            {tSection("title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {services.map((service) => {
            const Icon = ICONS[service.icon] ?? Home;
            return (
              <Card key={service.id} hover className="group overflow-hidden">
                <div className="h-1 bg-[var(--color-primary)] group-hover:bg-[var(--color-secondary)] transition-colors duration-300" />
                <div className="p-6 flex flex-col gap-4">
                  <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 flex items-center justify-center group-hover:bg-[var(--color-primary)] transition-colors duration-300">
                    <Icon
                      size={22}
                      className="text-[var(--color-primary)] group-hover:text-white transition-colors duration-300"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-[var(--font-display)] font-bold text-xl mb-2">
                      {t(service.name, locale)}
                    </h3>
                    <p className="text-sm text-[var(--color-muted)] leading-relaxed">
                      {t(service.shortDescription, locale)}
                    </p>
                  </div>
                  <Link
                    href={getLocalizedPath(`/services/${service.slug}`, locale)}
                    className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)] hover:gap-3 transition-all duration-200"
                  >
                    {tCommon("learnMore")} <ArrowRight size={15} />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Link href={getLocalizedPath("/services", locale)}>
            <Button variant="outline">{tSection("cta")}</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}