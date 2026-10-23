# Environnements et variables d'environnement

Ce document décrit les environnements de `byb-platform`, les variables que le code lit réellement, et la procédure
pour créer et faire évoluer un environnement distant. Le modèle des variables est dans `.env.example`.

## 1. Environnements

| Environnement | Usage | Base Supabase | Où vivent les variables |
|---|---|---|---|
| Local (développement) | Développement quotidien | Projet de développement distant, ou `supabase start` | `.env.local` (ignoré par git) |
| Tests | Vitest, pgTAP, E2E | `supabase start` (base locale jetable) | `.env.test` (ignoré par git), secrets factices en CI |
| Production | Site public | Projet Supabase de production, **distinct de tous les autres** | Variables de l'hébergeur + environnement GitHub `production` |

Règle absolue : un projet Supabase par environnement distant, avec des clés différentes. Aucune clé de production
n'est jamais copiée sur un poste de développement ni dans un fichier versionné.

Note préproduction : la formule gratuite de Supabase limite le nombre de projets actifs. Si un troisième projet n'est
pas souhaité, le projet de développement actuel peut servir de préproduction, au prix d'un mélange entre données de
test et données de recette (les témoignages fictifs, par exemple). À décider avec le client avant la recette.

## 2. Variables

Portée : **build** = lue pendant `next build` et figée dans le bundle (toute variable `NEXT_PUBLIC_*`) ;
**runtime** = lue au démarrage du serveur. Une variable `NEXT_PUBLIC_*` est visible de tout visiteur.

| Variable | Secret | Portée | Production | Rôle |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | non | build + runtime | requise | URL du projet Supabase de l'environnement |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | non | build + runtime | requise | Clé publique (`anon` ou `publishable`) ; la RLS est la barrière |
| `SUPABASE_SERVICE_ROLE_KEY` | **oui** | runtime | requise | Clé qui contourne la RLS : jetons de rendez-vous, invitations, audit |
| `NEXT_PUBLIC_APP_URL` | non | build + runtime | requise, en `https://` | Liens des emails, origine des Server Actions, métadonnées |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | non | build + runtime | requise | Construction des URLs de médias |
| `CLOUDINARY_CLOUD_NAME` | non | runtime | facultative | Repli sur la variable publique si absente |
| `CLOUDINARY_API_KEY` | non | runtime | requise | Signature des envois |
| `CLOUDINARY_API_SECRET` | **oui** | runtime | requise | Signature des envois et suppression de médias |
| `RESEND_API_KEY` | **oui** | runtime | requise | Envoi des emails |
| `RESEND_FROM_EMAIL` | non | runtime | à définir (voir P11.3) | Expéditeur ; domaine vérifié chez Resend |
| `ADMIN_NOTIFICATION_EMAIL` | non | runtime | facultative | Repli ; le réglage du dashboard est prioritaire |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | non | build + runtime | recommandée | Widget anti-robot |
| `TURNSTILE_SECRET_KEY` | **oui** | runtime | recommandée | Vérification serveur ; à définir avec la clé du widget ou pas du tout |

La validation est faite au démarrage du serveur par `src/lib/env.ts` : une variable absente ou mal formée arrête le
démarrage avec la liste de tous les problèmes. Elle est volontairement ignorée pendant `next build`.

Conséquence pour Docker (P11.2) : les variables `NEXT_PUBLIC_*` doivent être connues **au build** de l'image (arguments
de build), car elles sont figées dans le JavaScript envoyé au navigateur. Les secrets, eux, ne sont fournis qu'à
l'exécution.

### Variables des tests uniquement

| Variable | Usage |
|---|---|
| `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` | Compte admin des scénarios E2E (créé par `npm run e2e:seed`) |
| `E2E_SUPERADMIN_EMAIL`, `E2E_SUPERADMIN_PASSWORD` | Compte superadmin des scénarios E2E |
| `E2E_DISABLED_EMAIL`, `E2E_DISABLED_PASSWORD` | Compte désactivé (refus de connexion) |
| `E2E_BASE_URL` | Cible d'un serveur déjà lancé |
| `E2E_PRODUCTION` | `1` : les E2E lancent `npm run start` au lieu de `npm run dev` |
| `LOAD_P95_BUDGET_MS` | Budget du test de charge d'intégration |

Dans `.env.test`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` doit contenir la clé **publique** de la base locale (`sb_publishable_...`
ou `anon`), jamais la clé `sb_secret_...` : une variable `NEXT_PUBLIC_*` est publiée dans le bundle.

## 3. Créer le projet Supabase de production

1. **Création** : nouveau projet, région de l'Union européenne (le client est en Belgique, RGPD), mot de passe de base
   long et aléatoire, rangé dans le gestionnaire de mots de passe de l'équipe.
2. **Inscriptions publiques désactivées** (Authentication > Providers > Email > « Allow new users to sign up » à
   désactivé). Point de sécurité : le déclencheur `handle_new_user` donne à tout nouveau compte le rôle `admin` actif
   avec les permissions par défaut (consultation et export des rendez-vous). Avec les inscriptions ouvertes, n'importe
   qui possédant la clé publique, visible dans le navigateur, pourrait créer un compte et entrer dans le dashboard. Les
   administrateurs sont créés par invitation, qui reste possible inscriptions fermées.
   Le `supabase/config.toml` local a `enable_signup = true` : il ne s'applique pas aux projets distants.
3. **URL d'authentification** (Authentication > URL Configuration) : *Site URL* = l'URL publique de l'environnement ;
   *Redirect URLs* = le même domaine, route `/auth/callback` (invitation, réinitialisation du mot de passe).
4. **Gabarits d'email** Recovery et Invite avec le paramètre `token_hash` (voir P1.4) ; envoi par SMTP Resend plutôt
   que par l'expéditeur par défaut de Supabase, limité en volume (traité en P11.3).
5. **Migrations** : ne pas les exécuter à la main. Configurer l'environnement GitHub (section 4), puis lancer le
   workflow « Database migrations ».
6. **Contrôles après la première application** (éditeur SQL du projet) :
   - `select count(*) from supabase_migrations.schema_migrations;` renvoie le nombre de fichiers de `supabase/migrations/`.
   - `select jobname, schedule from cron.job;` liste les tâches planifiées : génération glissante des créneaux
     (`generate-rolling-slots`), purge des compteurs anti-abus, anonymisation des rendez-vous échus. Si la liste est
     vide, l'extension `pg_cron` n'était pas disponible : l'activer (Database > Extensions), puis exécuter dans l'éditeur
     SQL le bloc de planification qui termine les migrations 0014 et 0018 (`db push` ne rejoue pas une migration déjà appliquée).
   - Database > Replication : la table `appointments` figure dans la publication `supabase_realtime` (cloche du dashboard).
7. **Premier superadmin** : script de P11.5. Aucun compte n'existe tant qu'il n'a pas été exécuté.

Ne jamais lancer `npm run db:types` contre la production : le script cible le projet de développement, et les types
générés doivent venir d'un schéma identique à celui des migrations.

## 4. Application des migrations par la CI

Workflow : `.github/workflows/database-migrations.yml`.

| Déclencheur | Cible | Garde-fous |
|---|---|---|
| Push sur `main` modifiant `supabase/migrations/` | Préproduction | `--dry-run` d'abord, file d'attente par environnement |
| Lancement manuel, environnement `production` | Production | Approbation de l'environnement GitHub, branche `main` seule, simulation par défaut |

Configuration à faire une fois dans GitHub (Settings > Environments) :

1. Créer les environnements `preprod` et `production`.
2. `production` : *Required reviewers* = au moins une personne ; *Deployment branches* = `main` uniquement.
3. Dans chaque environnement :
   - variable `SUPABASE_PROJECT_REF` : référence du projet de cet environnement ;
   - secret `SUPABASE_DB_PASSWORD` : mot de passe de la base de ce projet ;
   - secret `SUPABASE_ACCESS_TOKEN` : jeton personnel Supabase (Account > Access Tokens) d'un compte qui a accès au projet.

Règles d'exploitation :

- Une migration déjà appliquée à un environnement partagé n'est jamais modifiée ni supprimée : on en ajoute une nouvelle.
- Production : lancer d'abord le workflow en simulation (réglage par défaut), relire la liste des migrations en attente
  dans le journal, puis relancer avec la simulation désactivée.
- Une migration doit rester compatible avec la version de l'application encore en ligne : migrer d'abord, déployer
  ensuite, et séparer en deux étapes tout changement qui supprime ou renomme une colonne.
- Sauvegarde avant toute migration de production : voir P11.4.

## 5. Rotation d'une clé

Une clé exposée (message, capture d'écran, dépôt) est considérée compromise : la régénérer chez le fournisseur,
mettre à jour la variable de l'hébergeur et, pour une variable `NEXT_PUBLIC_*`, reconstruire l'application. La
procédure complète d'incident est prévue dans le runbook (P11.7).
