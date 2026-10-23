# BYB Platform

Application web de BYB, entreprise de construction basée en Belgique. Le dépôt regroupe le site vitrine multilingue, la prise de rendez-vous en ligne et un espace d'administration (rendez-vous, créneaux, congés, services, utilisateurs, permissions, journal d'audit, réglages).

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Technologies](#technologies)
- [Prérequis](#prérequis)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données Supabase](#base-de-données-supabase)
- [Commandes disponibles](#commandes-disponibles)
- [Tests](#tests)
- [Docker](#docker)
- [Déploiement](#déploiement)
- [Organisation du code](#organisation-du-code)
- [Contribuer](#contribuer)
- [Avant la mise en production](#avant-la-mise-en-production)
- [Documentation complémentaire](#documentation-complémentaire)

## Fonctionnalités

- Pages publiques : accueil, services, réalisations, à propos, contact, mentions légales, politique de confidentialité.
- Interface en français, anglais et allemand (le français est la langue de référence, l'anglais et l'allemand se replient sur lui).
- Assistant de réservation (service, prestation, créneau, confirmation), page dédiée `/rdv`, annulation et modification par lien sécurisé reçu par email.
- Bouton « Prendre rendez-vous » flottant sur toutes les pages publiques.
- Espace d'administration protégé avec deux rôles : `admin` (droits configurables) et `superadmin` (tous les droits, gestion des utilisateurs et des permissions).
- Emails transactionnels localisés (confirmation, annulation, déplacement) avec fichier de calendrier `.ics`.
- Protection contre les doubles réservations, limitation de débit et anti-robot (Cloudflare Turnstile, facultatif).
- Journal d'audit immuable, export Excel et CSV, conformité RGPD (anonymisation, export et effacement des données d'une personne).

## Technologies

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, next-intl, Supabase (Auth, PostgreSQL, Realtime), Zod, TanStack Query, Zustand, Resend, Cloudinary, Vitest, Playwright et pgTAP. Les versions exactes sont dans `package.json` et `package-lock.json`.

## Prérequis

- Node.js 22 et npm (la CI utilise Node.js 22).
- Git.
- Docker Desktop, pour la base Supabase locale, les tests SQL et l'image de production.
- Supabase CLI : aucune installation globale n'est nécessaire, les commandes utilisent `npx supabase`.
- Facultatif selon ce que vous voulez exercer : un compte Cloudinary (médias), un compte Resend (emails), un site Cloudflare Turnstile (anti-robot).

## Démarrage rapide

1. Clonez le dépôt et installez les dépendances.

   ```bash
   git clone https://github.com/Cedric-20033/byb-platform.git
   cd byb-platform
   npm ci
   ```

2. Créez votre fichier d'environnement à partir du modèle. Ne le commitez jamais.

   ```bash
   cp .env.example .env.local          # macOS, Linux, Git Bash
   Copy-Item .env.example .env.local   # PowerShell
   ```

3. Démarrez la base Supabase locale (Docker doit être lancé). Les migrations sont appliquées automatiquement au premier démarrage.

   ```bash
   npx supabase start
   npx supabase status -o env
   ```

   La seconde commande affiche l'URL de l'API et les clés. Reportez-les dans `.env.local` :

   | Variable de `.env.local` | Valeur affichée par la commande |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `API_URL` (en général `http://127.0.0.1:54321`) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `ANON_KEY` (clé publique, jamais la clé secrète) |
   | `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` |

   Laissez `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Pour utiliser un projet Supabase distant à la place, voir [Base de données Supabase](#base-de-données-supabase).

4. Créez le premier compte superadmin. Aucun compte n'existe sur une base neuve.
   - Ouvrez Supabase Studio (`http://127.0.0.1:54323`), menu Authentication, Users, Add user. Saisissez un email et un mot de passe, et cochez la confirmation automatique de l'email.
   - Dans l'éditeur SQL de Studio, promouvez ce compte (un nouveau compte est `admin` par défaut) :

     ```sql
     update public.profiles set role = 'superadmin' where email = 'vous@exemple.com';
     ```

   Les autres administrateurs se créent ensuite par invitation depuis le tableau de bord, page Utilisateurs.

5. Chargez des données de départ (facultatif, le site s'affiche sans). Ces scripts lisent `.env.local` :

   ```bash
   npm run migrate:services       # catalogue de services (voir ci-dessous)
   npm run seed:slots             # 60 jours de créneaux pour les services actifs
   npm run migrate:testimonials   # témoignages fictifs de démonstration
   ```

   `migrate:services` exige les trois variables Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) et un dossier contenant un sous-dossier par service (nommé comme son slug) avec les images à envoyer. Indiquez-le avec `SERVICES_UPLOADS_DIR` dans `.env.local` ; un dossier vide convient, les services sont alors créés avec une galerie vide. Vous pouvez aussi créer les services directement depuis le tableau de bord. `seed:slots` doit être lancé après les services.

6. Lancez l'application.

   ```bash
   npm run dev
   ```

   Site public : [http://localhost:3000](http://localhost:3000), qui redirige vers `/fr`. Les routes utilisent toujours un préfixe de langue (`/fr`, `/en`, `/de`). Connexion à l'administration : [http://localhost:3000/login](http://localhost:3000/login).

Emails en local : les emails d'authentification (réinitialisation de mot de passe) arrivent dans la boîte de test de Supabase, `http://127.0.0.1:54324`. Les emails de l'application (réservation, contact) partent par Resend : renseignez `RESEND_API_KEY` (une clé gratuite suffit) et, en développement, `RESEND_FROM_EMAIL=onboarding@resend.dev`, qui n'envoie qu'à l'adresse du compte Resend.

## Variables d'environnement

Les fichiers `.env*` sont ignorés par Git, sauf `.env.example` qui sert de modèle. N'utilisez jamais de clés de production en local.

| Variable | Usage |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase, visible du navigateur. Les règles RLS protègent les données. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé privilégiée, serveur uniquement. Ne jamais la préfixer par `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_APP_URL` | URL publique du site, sans barre finale (en production : `https://`). |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Nom du compte Cloudinary, pour construire les URLs de médias. |
| `CLOUDINARY_CLOUD_NAME` | Facultative : nom du compte côté serveur ; à défaut, la variable publique est utilisée. Requise par `migrate:services`. |
| `CLOUDINARY_API_KEY` | Clé API Cloudinary, serveur. |
| `CLOUDINARY_API_SECRET` | Secret Cloudinary, serveur. Ne jamais l'exposer. |
| `RESEND_API_KEY` | Clé API Resend (requise en production). |
| `RESEND_FROM_EMAIL` | Adresse d'expédition d'un domaine vérifié chez Resend. |
| `ADMIN_NOTIFICATION_EMAIL` | Destinataire de repli des notifications ; le réglage du tableau de bord est prioritaire. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Anti-robot Cloudflare. Définir les deux ou aucune. |

Les variables `NEXT_PUBLIC_*` sont lues à la compilation (`next build`) et figées dans le code envoyé au navigateur : après les avoir modifiées, il faut reconstruire l'application. La validation des variables est faite au démarrage du serveur, avec la liste de tous les problèmes en cas d'erreur.

## Base de données Supabase

La configuration locale est dans `supabase/config.toml`. L'historique du schéma, des règles d'accès (RLS) et des fonctions est dans `supabase/migrations/`, les tests SQL dans `supabase/tests/`.

Base locale (recommandée pour développer) :

```bash
npx supabase start      # démarre la pile locale et applique les migrations
npx supabase db reset   # réinitialise la base à partir des migrations
npx supabase stop       # arrête la pile
```

Projet Supabase distant (développement partagé, préproduction, production) :

```bash
npx supabase login
npx supabase link --project-ref <reference-du-projet>
npx supabase db push --dry-run   # liste les migrations en attente, n'écrit rien
npx supabase db push
```

Pour les environnements partagés, les migrations sont appliquées par la CI (voir [Déploiement](#déploiement)) plutôt qu'à la main.

Règles à respecter :

- Toute modification de schéma est une nouvelle migration. Une migration déjà appliquée à un environnement partagé n'est ni modifiée ni supprimée.
- Sur un projet distant, désactivez les inscriptions publiques (Authentication, Providers, Email, « Allow new users to sign up »). Un nouveau compte reçoit par défaut le rôle `admin` : les inscriptions ouvertes donneraient accès au tableau de bord à n'importe qui. Les administrateurs se créent par invitation, qui reste possible.
- Les types TypeScript de la base (`src/types/database.ts`) se régénèrent après chaque migration :

  ```bash
  npx supabase gen types typescript --local --schema public > src/types/database.ts
  ```

  Le script `npm run db:types` fait la même chose depuis un projet distant, mais son identifiant de projet est écrit dans `package.json` : remplacez-le par le vôtre avant de l'utiliser.

## Commandes disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement. |
| `npm run build` | Build de production. |
| `npm run start` | Sert le build de production. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | Vérification TypeScript sans émission de fichiers. |
| `npm run test` | Tests unitaires et de composants (Vitest). |
| `npm run test:watch` | Vitest en mode surveillance. |
| `npm run test:coverage` | Tests avec rapport et seuils de couverture. |
| `npm run test:db` | Tests SQL pgTAP (base locale démarrée). |
| `npm run test:integration` | Tests de concurrence et de charge contre une vraie base. |
| `npm run test:e2e` | Tests de bout en bout Playwright. |
| `npm run e2e:seed` | Crée les comptes et le service de test des E2E (base jetable uniquement). |
| `npm run check:skipped` | Échoue si un test est ignoré sans justification. |
| `npm run seed:slots` | Génère 60 jours de créneaux pour les services actifs. |
| `npm run migrate:services` | Importe le catalogue de services (et ses médias) en base. |
| `npm run migrate:testimonials` | Importe les témoignages de démonstration. |
| `npm run db:types` | Génère les types depuis un projet Supabase distant (voir plus haut). |

## Tests

Avant d'ouvrir une pull request :

```bash
npm run lint
npm run typecheck
npm run test
```

Tests SQL, d'intégration et E2E (la base locale doit tourner : `npx supabase start`) :

```bash
npm run test:db
npx dotenv -e .env.test -- npm run test:integration
```

Pour les E2E, créez un fichier `.env.test` (ignoré par Git) qui pointe vers la base locale, puis installez le navigateur et lancez la suite :

```bash
# .env.test : valeurs de la base locale (npx supabase status -o env) et valeurs factices pour le reste
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=test
CLOUDINARY_API_KEY=test
CLOUDINARY_API_SECRET=test
RESEND_API_KEY=re_test_dummy
E2E_ADMIN_EMAIL=e2e-admin@byb.test
E2E_ADMIN_PASSWORD=<mot-de-passe-de-test>
E2E_SUPERADMIN_EMAIL=e2e-superadmin@byb.test
E2E_SUPERADMIN_PASSWORD=<mot-de-passe-de-test>
E2E_DISABLED_EMAIL=e2e-disabled@byb.test
E2E_DISABLED_PASSWORD=<mot-de-passe-de-test>
```

```bash
npx playwright install chromium
npx dotenv -e .env.test -- npm run e2e:seed
npx dotenv -e .env.test -- npm run test:e2e
```

Pour rejouer les E2E sur un build de production (durées et en-têtes de sécurité représentatifs), construisez avec les mêmes variables, puis lancez avec `E2E_PRODUCTION=1` :

```bash
npx dotenv -o -e .env.test -- npm run build
E2E_PRODUCTION=1 npx dotenv -o -e .env.test -- npm run test:e2e   # PowerShell : $env:E2E_PRODUCTION=1 avant la commande
```

La CI GitHub exécute lint, types, tests unitaires avec seuils de couverture, build, tests SQL, tests d'intégration et E2E sur les pull requests.

## Docker

L'image de production est construite en trois étapes, s'exécute sans droits root et expose une sonde de santé sur `/api/health`. Les variables `NEXT_PUBLIC_*` sont fournies au build, les secrets uniquement à l'exécution.

```bash
cp .env.example .env     # puis renseignez les valeurs de l'environnement visé
docker compose up --build
```

L'application répond sur `http://localhost:3000`. Le conteneur ne voit pas `127.0.0.1` de votre machine : pour le faire parler à une base Supabase locale, utilisez `http://host.docker.internal:54321` comme URL Supabase.

## Déploiement

- Un projet Supabase distinct par environnement (développement, préproduction, production), avec des clés différentes.
- Variables d'environnement renseignées chez l'hébergeur (Vercel, conteneur, autre). Les variables `NEXT_PUBLIC_*` doivent exister au moment du build.
- Migrations : le workflow GitHub `Database migrations` les applique, automatiquement en préproduction, sur lancement manuel et approbation en production. Il s'appuie sur trois valeurs par environnement GitHub : la variable `SUPABASE_PROJECT_REF` et les secrets `SUPABASE_DB_PASSWORD` et `SUPABASE_ACCESS_TOKEN`.
- Sur chaque projet Supabase distant : inscriptions publiques désactivées, URL du site et URL de redirection (`/auth/callback`) renseignées, gabarits d'email d'authentification configurés.
- Après le premier déploiement, créer le premier superadmin (voir [Démarrage rapide](#démarrage-rapide), étape 4) et vérifier `/api/health`.

## Organisation du code

```text
src/
├── app/              # Routes Next.js, pages et Server Actions
├── application/      # Cas d'usage métier
├── domain/           # Entités, règles métier et ports (interfaces)
├── infrastructure/   # Adaptateurs Supabase, Cloudinary, Resend, audit, anti-robot
├── components/       # Composants d'interface publics, administration et réservation
├── data/             # Contenu éditorial et jeux de données de départ
├── lib/              # Configuration, localisation, dates, validation, utilitaires
└── test/             # Configuration de test, doublures et tests d'intégration
supabase/
├── migrations/       # Historique des migrations SQL
└── tests/            # Tests SQL (RLS, fonctions, contraintes)
e2e/                  # Scénarios Playwright
messages/             # Traductions fr, en, de
scripts/              # Scripts de données et de contrôle
public/               # Images et ressources statiques
```

Le projet suit une architecture hexagonale : le domaine ne dépend d'aucun fournisseur technique, les cas d'usage dépendent des ports, l'infrastructure les implémente et les Server Actions assemblent le tout. Les droits sont vérifiés côté serveur et par les règles RLS de la base.

## Contribuer

1. Lisez `ARCHITECTURE.md`. Next.js 16 comporte des changements de conventions : avant de modifier du code lié au framework, consultez la documentation installée dans `node_modules/next/dist/docs/`.
2. Gardez la logique métier dans le domaine et les cas d'usage, jamais dans les composants ni les routes.
3. Aucun texte visible en dur : toute clé de traduction est ajoutée dans `messages/fr.json`, `messages/en.json` et `messages/de.json`.
4. Ajoutez les tests pertinents et lancez lint, types et tests avant d'ouvrir une pull request.
5. Pour un changement de base, ajoutez une migration et vérifiez les règles RLS associées.

## Avant la mise en production

- Remplacer ou dépublier les témoignages fictifs importés par `migrate:testimonials`.
- Renseigner les informations légales manquantes (forme juridique, hébergeur, durée de conservation des rendez-vous) et confirmer les chiffres affichés sur le site.
- Configurer un domaine d'envoi vérifié chez Resend et `RESEND_FROM_EMAIL`.
- Vérifier les sauvegardes quotidiennes du projet Supabase de production et tester une restauration.

## Documentation complémentaire

- `ARCHITECTURE.md` : architecture technique, règles de conception et matrice des permissions.
- `docs/ENVIRONNEMENTS.md` : environnements, variables, création du projet Supabase de production, migrations par la CI.
- `docs/RGPD.md` : registre des traitements, durées de conservation, procédure d'accès et d'effacement.
- `supabase/migrations/` : historique des changements de schéma et de sécurité.
