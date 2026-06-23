// src/types/index.ts

import type { I18nField } from '@/lib/utils';
import type { PermissionAction, PermissionDomain, UserRole } from '@/lib/constants';

// Ré-exports
export type { I18nField };

// RBAC

/**
 * Map des permissions d'un utilisateur admin.
 * Chaque domaine possède un ensemble d'actions autorisées ou non.
 * Stocké en JSONB dans Supabase (table profiles.permissions).
 *
 * @example
 * {
 *   appointments: { view: true, create: true, edit: true, delete: false },
 *   services:     { view: true, create: false, edit: false, delete: false },
 * }
 */
export type PermissionsMap = {
  [domain in PermissionDomain]?: {
    [action in PermissionAction]?: boolean;
  };
};

/**
 * Profil utilisateur étendu (au-delà des données Supabase Auth).
 * Correspond à la table `profiles` en base de données.
 */
export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  permissions: PermissionsMap;
  createdAt: string;
  updatedAt: string;
};

// Données statiques (data/) 

/**
 * Un service proposé par l'entreprise.
 * Structure pensée pour la migration future vers Supabase (champs i18n en JSONB).
 */
export type Service = {
  id: string;
  slug: string;
  name: I18nField;
  shortDescription: I18nField;
  fullDescription: I18nField;
  icon: string;           // nom de l'icône Lucide
  coverImage: string;     // chemin dans /public
  galleryImages: string[];
  isActive: boolean;
  order: number;
  subServices: SubService[];
};

export type SubService = {
  id: string;
  slug: string;
  name: I18nField;
  description: I18nField;
};

/**
 * Une réalisation / photo de chantier.
 */
export type Project = {
  id: string;
  title: I18nField;
  description: I18nField;
  image: string;
  category: string;       // slug du service associé
  date: string;           // ISO date string
  isHighlighted: boolean; // mis en avant sur la page d'accueil
};

/**
 * Un témoignage client.
 */
export type Testimonial = {
  id: string;
  authorName: string;
  authorLocation: string;
  content: I18nField;
  rating: 1 | 2 | 3 | 4 | 5;
  date: string;
  avatarImage?: string;
};

/**
 * Un jalon dans la timeline de l'historique d'entreprise.
 */
export type TimelineEvent = {
  id: string;
  year: number;
  title: I18nField;
  description: I18nField;
  image?: string;
};

/**
 * Un compteur statistique affiché sur le site.
 */
export type Stat = {
  id: string;
  value: number;
  suffix: string;          // ex: '+', '%', 'ans'
  label: I18nField;
  icon: string;
};

/**
 * Un lien de navigation.
 */
export type NavLink = {
  label: I18nField;
  href: string;
  children?: NavLink[];   // pour les sous-menus
};