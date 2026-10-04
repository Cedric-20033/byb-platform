import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { t } from "@/lib/utils";
import { getLocalizedPath, Locale } from "@/lib/routing";
import { company } from "@/data/company";
import { footerQuickLinks, footerLegalLinks } from "@/data/navigation";

export function Footer() {
  // Clés issues de fr.json : "footer.quickLinks", "footer.contact", "footer.rights"
  const tFooter = useTranslations("footer");
  // Clés issues de fr.json : "contact.info.address", "contact.info.phone", etc.
  //const tContact = useTranslations('contact');
  const locale = useLocale() as Locale;
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--color-foreground)] text-[var(--color-background)]">
      <div className="h-1 bg-[var(--color-primary)]" />

      <div className="container-custom py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Identité */}
          <div className="lg:col-span-2 space-y-4">
            <div className="font-[var(--font-display)] font-bold text-3xl">
              <span className="text-[var(--color-secondary)]">BYB</span>{" "}
              <span className="text-[var(--color-background)]">Construction</span>
            </div>
            <p className="text-[color:color-mix(in_srgb,var(--color-background)_75%,transparent)] text-sm leading-relaxed max-w-xs">
              {t(company.description, locale)}
            </p>
            <div className="flex gap-3 pt-2">
              {/*company.socialLinks.facebook  && <SocialLink href={company.socialLinks.facebook}  label="Facebook"><Facebook  size={16} /></SocialLink>}
              {company.socialLinks.instagram && <SocialLink href={company.socialLinks.instagram} label="Instagram"><Instagram size={16} /></SocialLink>}
              {company.socialLinks.linkedin  && <SocialLink href={company.socialLinks.linkedin}  label="LinkedIn"><Linkedin  size={16} /></SocialLink>*/}
            </div>
          </div>

          {/* Liens rapides — clé fr.json : footer.quickLinks */}
          <div className="space-y-4">
            <h3 className="font-[var(--font-display)] font-bold text-sm uppercase tracking-widest text-[color:color-mix(in_srgb,var(--color-background)_60%,transparent)]">
              {tFooter("quickLinks")}
            </h3>
            <ul className="space-y-2">
              {footerQuickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={getLocalizedPath(link.href, locale)}
                    className="text-sm text-[color:color-mix(in_srgb,var(--color-background)_80%,transparent)] hover:text-[var(--color-secondary)] transition-colors"
                  >
                    {t(link.label, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact — clé fr.json : footer.contact + contact.info.* */}
          <div className="space-y-4">
            <h3 className="font-[var(--font-display)] font-bold text-sm uppercase tracking-widest text-[color:color-mix(in_srgb,var(--color-background)_60%,transparent)]">
              {tFooter("contact")}
            </h3>
            <ul className="space-y-3">
              {company.sites.map((site) => (
                <li
                  key={site.id}
                  className="flex items-start gap-3 text-sm text-[color:color-mix(in_srgb,var(--color-background)_80%,transparent)]"
                >
                  <MapPin
                    size={15}
                    className="mt-0.5 shrink-0 text-[var(--color-secondary)]"
                  />
                  <span>
                    <span className="font-semibold">{site.name}</span>
                    <br />
                    {site.address.street}
                    <br />
                    {site.address.postalCode} {site.address.city}
                  </span>
                </li>
              ))}
              <li>
                <a
                  href={`tel:${company.contact.phone}`}
                  className="flex items-center gap-3 text-sm text-[color:color-mix(in_srgb,var(--color-background)_80%,transparent)] hover:text-[var(--color-secondary)] transition-colors"
                >
                  <Phone
                    size={15}
                    className="shrink-0 text-[var(--color-secondary)]"
                  />
                  {company.contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${company.contact.email}`}
                  className="flex items-center gap-3 text-sm text-[color:color-mix(in_srgb,var(--color-background)_80%,transparent)] hover:text-[var(--color-secondary)] transition-colors"
                >
                  <Mail
                    size={15}
                    className="shrink-0 text-[var(--color-secondary)]"
                  />
                  {company.contact.email}
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-[color:color-mix(in_srgb,var(--color-background)_80%,transparent)]">
                <Clock
                  size={15}
                  className="shrink-0 text-[var(--color-secondary)]"
                />
                {t(company.openingHours, locale)}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bas de page — clé fr.json : footer.rights + legal.* */}
      <div className="border-t border-[color:color-mix(in_srgb,var(--color-background)_12%,transparent)]">
        <div className="container-custom py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[color:color-mix(in_srgb,var(--color-background)_55%,transparent)]">
            © {year} {company.fullName}. {tFooter("rights")}.
          </p>
          <ul className="flex gap-4">
            {footerLegalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={getLocalizedPath(link.href, locale)}
                  className="text-xs text-[color:color-mix(in_srgb,var(--color-background)_55%,transparent)] hover:text-[var(--color-secondary)] transition-colors"
                >
                  {t(link.label, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
