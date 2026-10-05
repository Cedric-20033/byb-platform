# BYB Platform

Application web de BYB, entreprise de construction basée en Belgique. Le dépôt regroupe le site vitrine multilingue, la prise de rendez-vous et un espace d’administration pour gérer les rendez-vous, les créneaux et les jours de fermeture.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Technologies](#technologies)
- [Prérequis](#prérequis)
- [Installation et lancement](#installation-et-lancement)
- [Configuration](#configuration)
- [Base de données Supabase](#base-de-données-supabase)
- [Commandes disponibles](#commandes-disponibles)
- [Organisation du code](#organisation-du-code)
- [Contribuer](#contribuer)
- [État et points de suivi](#état-et-points-de-suivi)
- [Documentation complémentaire](#documentation-complémentaire)

## Fonctionnalités

- Pages publiques de présentation, services, réalisations, contact et informations légales.
- Interface en français, anglais et allemand, avec le français comme langue de référence.
- Parcours de réservation de rendez-vous et consultation des créneaux disponibles.
- Espace d’administration protégé pour les rendez-vous, les créneaux, les jours fériés et les indicateurs d’activité.
- Authentification et contrôle d’accès fondés sur Supabase, avec rôles et permissions.
- Envoi d’emails via Resend, médias distants via Cloudinary et journal d’audit des opérations concernées.

## Technologies

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, next-intl, Supabase (Auth et PostgreSQL), Zod, Vitest et Playwright. Les dépendances détaillées et leurs versions sont définies dans `package.json` et `package-lock.json`.

## Prérequis

- Node.js 22 recommandé (la CI utilise Node.js 22) et npm.
- Un projet Supabase pour les fonctions qui utilisent l’authentification ou la base distante. Supabase CLI et Docker sont requis pour exécuter la base locale et les tests SQL.
- Les identifiants Cloudinary et Resend si vous souhaitez exercer les fonctions de médias et d’envoi d’emails.

## Installation et lancement

1. Clonez le dépôt et placez-vous à sa racine.

   ```bash
   git clone https://github.com/Cedric-20033/byb-platform.git
   cd byb-platform
   ```

2. Installez les dépendances verrouillées par le dépôt.

   ```bash
   npm ci
   ```

3. Créez `.env.local` à la racine et renseignez au minimum les variables nécessaires au démarrage décrites dans [Configuration](#configuration). Ne commitez jamais ce fichier.

4. Démarrez le serveur de développement.

   ```bash
   npm run dev
   ```

   Ouvrez [http://localhost:3000](http://localhost:3000). Les routes publiques utilisent les préfixes de langue `/fr`, `/en` et `/de` ; la configuration du routage se trouve dans `src/lib/routing.ts`.

Pour un environnement local complet, démarrez Supabase avant d’utiliser les fonctions connectées à la base (voir [Base de données Supabase](#base-de-données-supabase)).

## Configuration

Les fichiers `.env*` sont ignorés par Git. Demandez les valeurs de développement à la personne qui gère le projet ; n’utilisez pas de clés de production dans un environnement local.

| Variable | Usage |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase ; nécessaire aux clients Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase utilisée côté navigateur et serveur. Les règles RLS doivent protéger les données. |
| `NEXT_PUBLIC_APP_URL` | URL de l’application, notamment pour les métadonnées ; par exemple `http://localhost:3000`. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Nom Cloudinary utilisé pour construire les URLs publiques des médias. |
| `CLOUDINARY_CLOUD_NAME` | Nom du compte pour le fournisseur média côté serveur. |
| `CLOUDINARY_API_KEY` | Clé API Cloudinary côté serveur. |
| `CLOUDINARY_API_SECRET` | Secret Cloudinary côté serveur ; ne jamais l’exposer avec un préfixe `NEXT_PUBLIC_`. |
| `RESEND_API_KEY` | Clé d’API Resend pour les emails. |
| `RESEND_FROM_EMAIL` | Adresse d’expédition vérifiée ; facultative en développement (une valeur par défaut est configurée). |
| `ADMIN_NOTIFICATION_EMAIL` | Adresse de notification des nouvelles réservations ; facultative, avec une valeur de repli dans les données de l’entreprise. |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé privilégiée nécessaire à certains scripts d’administration ou de migration ; à garder strictement secrète et à ne jamais préfixer par `NEXT_PUBLIC_`. |

Les commandes `seed:slots`, `migrate:services` et `db:types` ont des besoins spécifiques : consultez leurs scripts et assurez-vous de cibler le bon projet avant exécution. `db:types` utilise actuellement un identifiant de projet distant défini dans `package.json`.

## Base de données Supabase

La configuration locale est dans `supabase/config.toml`. Les migrations versionnées de `supabase/migrations/` établissent le schéma, les relations, les profils et les règles d’accès RLS. Les tests de politiques et de triggers sont dans `supabase/tests/`.

Avec Docker et Supabase CLI installés, démarrez l’environnement local :

```bash
npx supabase start
```

La CLI affiche les URL et clés locales à utiliser dans `.env.local`. Pour réinitialiser la base locale à partir des migrations et du seed configuré :

```bash
npx supabase db reset
```

Exécutez les tests SQL sur la base locale :

```bash
npm run test:db
```

Les modifications de schéma doivent être apportées sous forme de nouvelles migrations. Ne réécrivez pas une migration déjà appliquée à un environnement partagé. Avant toute opération distante (`db push`, génération de types ou script de migration), vérifiez explicitement le projet Supabase ciblé et les sauvegardes requises.

## Commandes disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Lance Next.js en mode développement. |
| `npm run build` | Produit le build de production. |
| `npm run start` | Sert le build de production. |
| `npm run lint` | Exécute ESLint. |
| `npm run typecheck` | Vérifie les types TypeScript sans émettre de fichiers. |
| `npm run test` | Lance les tests unitaires Vitest une fois. |
| `npm run test:watch` | Lance Vitest en mode surveillance. |
| `npm run test:coverage` | Lance les tests avec le rapport de couverture. |
| `npm run test:e2e` | Lance Playwright sur les projets desktop et mobile définis dans `playwright.config.ts`. |
| `npm run test:db` | Lance les tests SQL Supabase (pgTAP). |
| `npm run seed:slots` | Exécute le script d’amorçage des créneaux ; nécessite des identifiants Supabase privilégiés. |
| `npm run migrate:services` | Migre les services avec le script prévu à cet effet ; vérifier les variables et chemins requis dans le script. |
| `npm run db:types` | Génère les types TypeScript de la base distante configurée dans `package.json`. |

La CI GitHub exécute lint, vérification TypeScript, tests unitaires et build sur les pull requests et les pushes vers `main`. Le job de base de données exécute les tests SQL ; le job E2E est déclenché manuellement et dépend de secrets GitHub dédiés.

## Organisation du code

```text
src/
├── app/              # Routes Next.js, pages et Server Actions
├── application/      # Cas d’usage métier
├── domain/           # Entités, règles métier et ports
├── infrastructure/   # Adaptateurs Supabase, Cloudinary, Resend et audit
├── components/       # Composants d’interface publics, admin et réservation
├── data/             # Contenu éditorial et données de présentation
├── lib/              # Configuration, localisation, dates et utilitaires
└── test/             # Configuration et doubles de test
supabase/
├── migrations/       # Historique des migrations SQL
└── tests/            # Tests SQL de sécurité et de base de données
e2e/                  # Scénarios Playwright
messages/             # Traductions françaises, anglaises et allemandes
```

Le projet vise une architecture hexagonale : le domaine reste indépendant des fournisseurs techniques, les cas d’usage dépendent des ports et l’infrastructure fournit leurs implémentations. Les Server Actions relient ces couches. Les conventions de contribution sont détaillées dans [ARCHITECTURE.md](ARCHITECTURE.md).

## Contribuer

1. Lisez `ARCHITECTURE.md` et les consignes `AGENTS.md` avant de modifier le code. Next.js 16 comporte des changements de conventions : pour tout changement touchant ses API, consultez d’abord la documentation installée dans `node_modules/next/dist/docs/`.
2. Gardez les changements métier dans les couches appropriées et ajoutez ou adaptez les traductions `messages/fr.json`, `messages/en.json` et `messages/de.json`.
3. Ajoutez les tests pertinents et lancez localement `npm run lint`, `npm run typecheck` et `npm run test` avant d’ouvrir une pull request. Les tests E2E et SQL nécessitent leurs environnements respectifs.
4. Pour les changements de base, ajoutez une migration et vérifiez les politiques RLS associées.

## État et points de suivi

La feuille de route `CLAUDE.md` est un document local ignoré par Git : elle n’est donc pas distribuée avec le dépôt et ne constitue pas une documentation accessible à tous les contributeurs. D’après son journal daté du 2 octobre 2026, P0.1 à P0.11 et P0.8b sont livrés, mais plusieurs vérifications associées sont explicitement laissées à l’équipe :

- Valider le trigger de profil avec la base distante avant d’appliquer les migrations, puis régénérer les types de base.
- Configurer et lancer l’environnement Supabase local et les tests SQL ; vérifier que la version majeure PostgreSQL configurée correspond au projet ciblé.
- Exécuter `knip` pour identifier le code inutilisé.
- Confirmer avec le client les données d’entreprise encore signalées comme à confirmer (année de fondation, effectifs, chantiers, pourcentage et forme juridique).
- Remplacer les témoignages fictifs par de vrais avis avant production. La feuille de route signale aussi des images de timeline manquantes.

La phase P1 et les phases suivantes sont cochées comme non commencées dans cette feuille de route. Le statut doit être confirmé par l’équipe, car ce fichier n’est pas versionné.

## Documentation complémentaire

- [ARCHITECTURE.md](ARCHITECTURE.md) — architecture technique et règles de conception.
- [AGENTS.md](AGENTS.md) — consignes de travail pour les agents de code.
- `supabase/migrations/` — historique des changements de schéma et de sécurité.
- `package.json` — scripts et dépendances disponibles.
