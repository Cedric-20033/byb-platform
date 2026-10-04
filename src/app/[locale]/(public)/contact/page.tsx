// src/app/[locale]/(public)/contact/page.tsx
"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { MapPin, Phone, Mail, Clock, Send, CheckCircle2 } from "lucide-react";
import { t } from "@/lib/utils";
import { company } from "@/data/company";
import { buildMapEmbedUrl } from "@/lib/maps";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * Page contact — Client Component (formulaire interactif).
 *
 * Clés fr.json utilisées :
 *   contact.title, contact.subtitle
 *   contact.form.firstName, contact.form.email ... contact.form.successTitle ...
 *   contact.info.address, contact.info.phone, contact.info.email, contact.info.hours
 *
 * Phase 2 : connecter handleSubmit à POST /api/contact
 */
export default function ContactPage() {
  const tPage = useTranslations("contact");
  const locale = useLocale();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      // TODO Phase 2 : await fetch('/api/contact', { method: 'POST', body: JSON.stringify(form) })
      await new Promise((r) => setTimeout(r, 1500));
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <section className="section-padding bg-[var(--color-primary)] text-white diagonal-bottom">
        <div className="container-custom text-center pb-8">
          <h1 className="text-5xl lg:text-6xl font-[var(--font-display)] font-black">
            {tPage("title")}
          </h1>
          <p className="text-white/70 text-lg mt-4">{tPage("subtitle")}</p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Formulaire */}
            <div className="lg:col-span-3">
              <Card className="p-8">
                {status === "success" ? (
                  <div className="text-center py-10 space-y-4">
                    <CheckCircle2
                      size={48}
                      className="mx-auto text-green-500"
                    />
                    <h2 className="font-[var(--font-display)] font-black text-2xl">
                      {tPage("form.successTitle")}
                    </h2>
                    <p className="text-[var(--color-muted)]">
                      {tPage("form.successMessage")}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field
                        label={tPage("form.firstName")}
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        required
                      />
                      <Field
                        label={tPage("form.lastName")}
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <Field
                      label={tPage("form.email")}
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                    <Field
                      label={tPage("form.phone")}
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                    />
                    <Field
                      label={tPage("form.subject")}
                      name="subject"
                      value={form.subject}
                      onChange={handleChange}
                      required
                    />

                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium">
                        {tPage("form.message")}
                      </label>
                      <textarea
                        name="message"
                        rows={5}
                        value={form.message}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                      />
                    </div>

                    {status === "error" && (
                      <p className="text-sm text-red-500">
                        {tPage("form.errorMessage")}
                      </p>
                    )}

                    <Button
                      type="submit"
                      isLoading={status === "loading"}
                      className="w-full"
                    >
                      {status === "loading"
                        ? tPage("form.sending")
                        : tPage("form.submit")}
                      {status !== "loading" && <Send size={16} />}
                    </Button>
                  </form>
                )}
              </Card>
            </div>

            {/* Coordonnées — clés fr.json : contact.info.* */}
            <div className="lg:col-span-2 space-y-6">
              <ul className="space-y-4">
                <InfoItem icon={MapPin} label={tPage("info.address")}>
                  {company.sites.map((site) => (
                    <p key={site.id} className="mb-2 last:mb-0">
                      <span className="font-semibold">{site.name}</span>
                      <br />
                      {site.address.street}
                      <br />
                      {site.address.postalCode} {site.address.city}
                    </p>
                  ))}
                </InfoItem>
                <InfoItem icon={Phone} label={tPage("info.phone")}>
                  <a
                    href={`tel:${company.contact.phone}`}
                    className="hover:text-[var(--color-primary)]"
                  >
                    {company.contact.phone}
                  </a>
                </InfoItem>
                <InfoItem icon={Mail} label={tPage("info.email")}>
                  <a
                    href={`mailto:${company.contact.email}`}
                    className="hover:text-[var(--color-primary)]"
                  >
                    {company.contact.email}
                  </a>
                </InfoItem>
                <InfoItem icon={Clock} label={tPage("info.hours")}>
                  {t(company.openingHours, locale)}
                </InfoItem>
              </ul>

              <div className="space-y-6">
                {company.sites.map((site) => (
                  <div key={site.id} className="space-y-2">
                    <h4 className="text-sm font-semibold text-[var(--color-foreground)]">
                      {site.name}
                    </h4>

                    <div className="rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)] h-64 md:h-72">
                      <iframe
                        src={buildMapEmbedUrl(site, locale)}
                        className="w-full h-full"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={tPage("map.title", { name: site.name })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Field({
  label,
  name,
  type = "text",
  value,
  onChange,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {required && (
          <span className="text-[var(--color-secondary)] ml-0.5">*</span>
        )}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-shadow"
      />
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-4">
      <div className="w-9 h-9 rounded-[var(--radius-md)] bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-[var(--color-primary)]" />
      </div>
      <div>
        <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide font-semibold">
          {label}
        </p>
        <div className="text-sm mt-0.5 leading-relaxed">{children}</div>
      </div>
    </li>
  );
}
