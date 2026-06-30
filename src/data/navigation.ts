// src/data/navigation.ts
import type { NavLink } from '@/types';
import { PUBLIC_ROUTES, ADMIN_ROUTES } from '@/lib/constants';

/**
 * Liens de navigation principale (Navbar).
 * Les labels sont i18n, les hrefs sont les routes constantes.
 */
export const mainNavLinks: NavLink[] = [
  {
    label: { fr: 'Accueil', en: 'Home', de: 'Startseite' },
    href: PUBLIC_ROUTES.HOME,
  },
  {
    label: { fr: 'Services', en: 'Services', de: 'Leistungen' },
    href: PUBLIC_ROUTES.SERVICES,
    children: [
      {
        label: { fr: 'Toiture', en: 'Roofing', de: 'Dach' },
        href: `${PUBLIC_ROUTES.SERVICES}/toiture`,
      },
      {
        label: { fr: 'Charpente', en: 'Roof framing', de: 'Dachstuhl' },
        href: `${PUBLIC_ROUTES.SERVICES}/charpente`,
      },
      {
        label: { fr: 'Bardage', en: 'Cladding', de: 'Verkleidung' },
        href: `${PUBLIC_ROUTES.SERVICES}/bardage`,
      },
      {
        label: { fr: 'EPDM', en: 'EPDM roofing', de: 'EPDM-Dach' },
        href: `${PUBLIC_ROUTES.SERVICES}/epdm`,
      },
      {
        label: { fr: 'Façade', en: 'Facade', de: 'Fassade' },
        href: `${PUBLIC_ROUTES.SERVICES}/facade`,
      },
      {
        label: { fr: 'Plafonnage', en: 'Plastering', de: 'Verputzarbeiten' },
        href: `${PUBLIC_ROUTES.SERVICES}/plafonnage`,
      },
      {
        label: { fr: 'Carrelage', en: 'Tiling', de: 'Fliesenarbeiten' },
        href: `${PUBLIC_ROUTES.SERVICES}/carrelage`,
      },
      {
        label: { fr: 'Panneaux solaires', en: 'Solar panels', de: 'Solarpaneele' },
        href: `${PUBLIC_ROUTES.SERVICES}/panneaux-solaires`,
      },
      {
        label: { fr: 'Chauffage sanitaire', en: 'Heating & sanitary', de: 'Heizung & Sanitär' },
        href: `${PUBLIC_ROUTES.SERVICES}/chauffage-sanitaire`,
      },
      {
        label: { fr: 'Maçonnerie', en: 'Masonry', de: 'Maurerarbeiten' },
        href: `${PUBLIC_ROUTES.SERVICES}/maconnerie`,
      },
    ],
  },
  {
    label: { fr: 'Réalisations', en: 'Projects', de: 'Referenzen' },
    href: PUBLIC_ROUTES.REALISATIONS,
  },
  {
    label: { fr: 'À propos', en: 'About', de: 'Über uns' },
    href: PUBLIC_ROUTES.ABOUT,
  },
  {
    label: { fr: 'Contact', en: 'Contact', de: 'Kontakt' },
    href: PUBLIC_ROUTES.CONTACT,
  },
];

/**
 * Liens du footer — section "Liens rapides".
 */
export const footerQuickLinks: NavLink[] = [
  { label: { fr: 'Nos services', en: 'Our services', de: 'Unsere Leistungen' }, href: PUBLIC_ROUTES.SERVICES },
  { label: { fr: 'Nos réalisations', en: 'Our projects', de: 'Unsere Referenzen' }, href: PUBLIC_ROUTES.REALISATIONS },
  { label: { fr: 'À propos', en: 'About us', de: 'Über uns' }, href: PUBLIC_ROUTES.ABOUT },
  { label: { fr: 'Contact', en: 'Contact', de: 'Kontakt' }, href: PUBLIC_ROUTES.CONTACT },
  // [PRÉVU — phase 2]
  // { label: { fr: 'Prendre un RDV', en: 'Book an appointment', de: 'Termin buchen' }, href: PUBLIC_ROUTES.DEVIS },
];

/**
 * Liens légaux dans le footer.
 */
export const footerLegalLinks: NavLink[] = [
  { label: { fr: 'Mentions légales', en: 'Legal notice', de: 'Impressum' }, href: PUBLIC_ROUTES.LEGAL },
  { label: { fr: 'Politique de confidentialité', en: 'Privacy policy', de: 'Datenschutz' }, href: PUBLIC_ROUTES.PRIVACY },
];

/**
 * Liens de la sidebar du dashboard admin.
 */
export const adminNavLinks: NavLink[] = [
  { label: { fr: 'Tableau de bord', en: 'Dashboard', de: 'Dashboard' }, href: ADMIN_ROUTES.DASHBOARD },
  { label: { fr: 'Services', en: 'Services', de: 'Leistungen' }, href: ADMIN_ROUTES.SERVICES },
  // [PRÉVU — phase 2]
  // { label: { fr: 'Rendez-vous', en: 'Appointments', de: 'Termine' }, href: ADMIN_ROUTES.APPOINTMENTS },
  // { label: { fr: 'Créneaux', en: 'Slots', de: 'Zeitfenster' }, href: ADMIN_ROUTES.SLOTS },
];

/**
 * Liens réservés au superadmin.
 */
export const superAdminNavLinks: NavLink[] = [
  { label: { fr: 'Utilisateurs', en: 'Users', de: 'Benutzer' }, href: ADMIN_ROUTES.USERS },
  { label: { fr: 'Permissions', en: 'Permissions', de: 'Berechtigungen' }, href: ADMIN_ROUTES.PERMISSIONS },
  { label: { fr: "Journal d'audit", en: 'Audit log', de: 'Audit-Protokoll' }, href: ADMIN_ROUTES.AUDIT_LOGS },
];