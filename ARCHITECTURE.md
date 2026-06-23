# BYB — Document d'Architecture Technique

> **Référence obligatoire** pour tout développeur rejoignant le projet.
> Lire ce document en entier avant d'écrire la moindre ligne de code.

---

## Stack Technique

| Rôle | Technologie | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.x |
| Langage | TypeScript | 5.x |
| Styling | Tailwind CSS v4 + shadcn/ui | 4.x |
| Animations | Framer Motion | latest |
| État UI | Zustand | latest |
| État serveur | TanStack Query | latest |
| i18n | next-intl | latest |
| Auth | Supabase Auth | latest |
| Base de données | Supabase (PostgreSQL) | latest |
| Emails | Resend + React Email | latest |
| Calendrier | react-big-calendar | latest |
| Validation | Zod | latest |
| Export | SheetJS (xlsx) | latest |

---

## Principes Architecturaux

### Architecture Hexagonale (Ports & Adapters)

Le code est organisé en **3 couches concentriques** strictement séparées :

```
┌─────────────────────────────────────────┐
│           INFRASTRUCTURE                │  ← Supabase, Resend, Next.js
│  ┌───────────────────────────────────┐  │
│  │          APPLICATION              │  │  ← Use Cases (ce que l'app fait)
│  │  ┌─────────────────────────────┐  │  │
│  │  │         DOMAINE             │  │  │  ← Règles métier pures
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Règle absolue :** une couche intérieure ne connaît jamais une couche extérieure.
- Le **domaine** ne connaît pas Supabase, ni Next.js, ni Resend.
- L'**application** ne connaît pas Supabase. Elle parle à des interfaces (ports).
- L'**infrastructure** implémente les interfaces définies par le domaine.

### Principes SOLID appliqués

| Principe | Application concrète |
|---|---|
| **S** — Single Responsibility | 1 fichier = 1 use case, 1 entité, 1 repository |
| **O** — Open/Closed | Nouveaux providers via nouvelles classes, sans modifier l'existant |
| **L** — Liskov | Tout Repository/Provider est interchangeable sans casser le code |
| **I** — Interface Segregation | Interfaces petites et ciblées (pas de "god interface") |
| **D** — Dependency Inversion | Les use cases reçoivent leurs dépendances par injection |

---

## Structure des Dossiers

```
src/
│
├── domain/                        # 💎 COUCHE DOMAINE — zéro dépendance externe
│   │                              #    Jamais de 'import' vers infrastructure/ ou app/
│   ├── appointment/               # Entité : Rendez-vous
│   │   ├── Appointment.ts         # Classe entité avec règles métier
│   │   ├── AppointmentStatus.ts   # Enum des statuts possibles
│   │   └── AppointmentRepository.ts # Interface (port) — contrat de persistance
│   ├── slot/                      # Entité : Créneau horaire
│   │   ├── Slot.ts
│   │   └── SlotRepository.ts
│   ├── service/                   # Entité : Service proposé
│   │   ├── Service.ts
│   │   └── ServiceRepository.ts
│   ├── user/                      # Entité : Utilisateur admin
│   │   ├── User.ts
│   │   └── UserRepository.ts
│   └── shared/                    # Interfaces partagées entre domaines
│       ├── EmailProvider.ts       # Port : envoi d'email
│       ├── AuditLogger.ts         # Port : journalisation
│       └── Result.ts              # Type Result<T, E> pour la gestion d'erreurs
│
├── application/                   # ⚙️ COUCHE APPLICATION — use cases métier
│   │                              #    Dépend uniquement de domain/
│   ├── booking/                   # [PRÉVU — module RDV phase 2]
│   │   ├── CreateAppointment.ts
│   │   ├── CancelAppointment.ts
│   │   └── GetAvailableSlots.ts
│   ├── admin/                     # [PRÉVU — module admin phase 2]
│   │   ├── BlockSlot.ts
│   │   ├── ManageHolidays.ts
│   │   └── ExportAppointments.ts
│   └── shared/
│       └── UseCaseBase.ts         # Classe abstraite commune
│
├── infrastructure/                # 🔌 COUCHE INFRASTRUCTURE — détails techniques
│   │                              #    Implémente les interfaces du domaine
│   ├── supabase/
│   │   ├── client.ts              # Client Supabase (browser)
│   │   ├── server.ts              # Client Supabase (server components)
│   │   └── repositories/         # [PRÉVU — implémentations Supabase]
│   ├── email/
│   │   └── ResendEmailProvider.ts # [PRÉVU — phase 2]
│   └── audit/
│       └── SupabaseAuditLogger.ts # [PRÉVU — phase 2]
│
├── data/                          # 📦 DONNÉES STATIQUES (placeholder → future migration Supabase)
│   │                              #    Toutes les données sont typées et structurées
│   │                              #    pour faciliter la migration future
│   ├── company.ts                 # Infos entreprise, coordonnées
│   ├── services.ts                # Services proposés (avec i18n)
│   ├── projects.ts                # Galerie chantiers
│   ├── testimonials.ts            # Avis clients
│   ├── timeline.ts                # Historique entreprise
│   ├── stats.ts                   # Compteurs (années, chantiers...)
│   └── navigation.ts              # Liens de navigation
│
├── components/                    # 🧩 COMPOSANTS UI
│   ├── ui/                        # Atoms shadcn/ui (Button, Input, Card...)
│   ├── layout/                    # Navbar, Footer, FloatingCTA
│   ├── sections/                  # Sections réutilisables (Hero, Services...)
│   ├── booking/                   # [PRÉVU — wizard de réservation phase 2]
│   └── admin/                     # Composants dashboard
│
├── app/                           # 🌐 NEXT.JS APP ROUTER
│   ├── [locale]/                  # Toutes les routes sont sous une locale
│   │   ├── layout.tsx             # Layout principal avec providers
│   │   ├── page.tsx               # Accueil /
│   │   ├── (public)/              # Route group — pages publiques
│   │   │   ├── services/
│   │   │   │   ├── page.tsx       # Liste des services
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx   # Détail d'un service
│   │   │   ├── realisations/
│   │   │   │   └── page.tsx       # Galerie chantiers
│   │   │   ├── a-propos/
│   │   │   │   └── page.tsx       # À propos + timeline
│   │   │   ├── contact/
│   │   │   │   └── page.tsx       # Contact + formulaire
│   │   │   ├── devis/             # [PRÉVU — phase 2]
│   │   │   │   └── page.tsx
│   │   │   ├── mentions-legales/
│   │   │   │   └── page.tsx
│   │   │   └── politique-confidentialite/
│   │   │       └── page.tsx
│   │   └── (admin)/               # Route group — dashboard protégé
│   │       ├── layout.tsx         # Guard auth + RBAC
│   │       └── dashboard/
│   │           ├── page.tsx       # Vue d'ensemble
│   │           ├── appointments/  # [PRÉVU — phase 2]
│   │           ├── slots/         # [PRÉVU — phase 2]
│   │           ├── services/      # Gestion services
│   │           ├── users/         # [superadmin] Gestion utilisateurs
│   │           ├── permissions/   # [superadmin] Gestion permissions
│   │           └── audit-logs/    # [superadmin] Journal des actions
│   ├── api/                       # API Routes Next.js
│   │   └── appointments/          # [PRÉVU — phase 2]
│   └── globals.css                # Variables CSS + styles globaux
│
├── lib/                           # 🛠️ UTILITAIRES PARTAGÉS
│   ├── validations/               # Schémas Zod partagés front/back
│   │   └── appointment.ts         # [PRÉVU — phase 2]
│   ├── utils.ts                   # Fonctions utilitaires générales
│   ├── i18n.ts                    # Configuration next-intl
│   └── constants.ts               # Constantes globales (locales, routes...)
│
├── types/                         # 📐 TYPES TYPESCRIPT GLOBAUX
│   ├── database.ts                # Types générés Supabase (à régénérer après migration)
│   ├── i18n.ts                    # Types pour les traductions
│   └── index.ts                   # Re-exports centralisés
│
└── messages/                      # 🌍 TRADUCTIONS i18n
    ├── fr.json                    # Français (langue principale)
    ├── en.json                    # Anglais [à compléter]
    └── de.json                    # Allemand [à compléter]

middleware.ts                      # i18n routing + protection routes admin
```

---

## Convention de Nommage

| Élément | Convention | Exemple |
|---|---|---|
| Composants React | PascalCase | `HeroSection.tsx` |
| Hooks | camelCase avec `use` | `useScrollPosition.ts` |
| Entités domaine | PascalCase | `Appointment.ts` |
| Use cases | PascalCase (verbe + nom) | `CreateAppointment.ts` |
| Interfaces | PascalCase sans `I` | `AppointmentRepository.ts` |
| Fichiers utilitaires | camelCase | `utils.ts` |
| Fichiers data | camelCase | `services.ts` |
| Dossiers | kebab-case | `a-propos/` |

---

## i18n — Internationalisation

### Locales supportées
- `fr` — Français (langue principale, obligatoire)
- `en` — Anglais (à venir)
- `de` — Allemand (à venir)

### Structure des URLs
```
/fr/services          → Page services en français
/en/services          → Page services en anglais
/fr/dashboard         → Dashboard admin en français
```

### Données i18n en base de données (JSONB)
Toutes les colonnes traduisibles utilisent le type `jsonb` avec la structure :
```json
{
  "fr": "Votre artisan de confiance",
  "en": "Your trusted craftsman",
  "de": "Ihr vertrauenswürdiger Handwerker"
}
```
**Règle :** le français est toujours présent. Les autres langues sont optionnelles avec fallback sur `fr`.

---

## RBAC — Gestion des Rôles

### Rôles définis
| Rôle | Description |
|---|---|
| `superadmin` | Accès total, gère les permissions des admins |
| `admin` | Accès défini par les permissions accordées par le superadmin |

### Permissions dynamiques (stockées en JSONB)
```json
{
  "appointments": { "view": true, "create": true, "edit": true, "delete": false },
  "services":     { "view": true, "create": false, "edit": false, "delete": false },
  "slots":        { "view": true, "create": true, "edit": true, "delete": false },
  "users":        { "view": false, "create": false, "edit": false, "delete": false },
  "audit_logs":   { "view": false }
}
```

---

## Variables d'Environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend (emails)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LOCALE=fr
```

---

## Règles pour les Contributeurs

1. **Ne jamais importer** `infrastructure/` depuis `domain/` ou `application/`
2. **Ne jamais mettre** de logique métier dans les composants React ou les routes API
3. **Toujours valider** avec Zod avant de traiter une donnée entrante
4. **Toujours commenter** la logique non évidente (pas les évidences)
5. **Toujours typer** explicitement — pas de `any`
6. **Toujours préfixer** les clés i18n par leur page/section (`home.hero.title`)
7. Les fichiers `data/` sont la source de vérité jusqu'à la migration Supabase

---

## Phases de Développement

| Phase | Contenu | Statut |
|---|---|---|
| **1 — Fondations** | Architecture, config, data layer | ✅ En cours |
| **2 — Site vitrine** | Pages publiques, composants UI | 🔜 |
| **3 — Dashboard Admin** | Auth, RBAC, interfaces admin | 🔜 |
| **4 — Module RDV** | Wizard, créneaux, emails | 📅 Prévu |
| **5 — Tests & Recette** | Tests, corrections, livraison | 📅 Prévu |