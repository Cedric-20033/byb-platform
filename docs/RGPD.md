# Conformité RGPD — BYB Construction

Ce document décrit **ce que le code fait réellement** des données personnelles des visiteurs, et la marche à suivre pour
répondre à une demande de droit d'accès ou d'effacement. La politique de confidentialité publique
(`/politique-confidentialite`) ne doit jamais affirmer plus que ce qui est écrit ici : modifier l'un sans l'autre rendrait
la page inexacte.

> Ce n'est pas un avis juridique. Les points marqués **À VALIDER** demandent la décision du client (responsable du
> traitement) ou, au besoin, celle d'un conseil juridique.

## 1. Registre des traitements (RGPD, art. 30)

| Traitement | Données | Finalité | Base légale | Où | Conservation |
|---|---|---|---|---|---|
| Prise de rendez-vous | nom, email, téléphone, notes facultatives, service, créneau, langue | gérer la demande, envoyer confirmations / modifications / annulations | mesures précontractuelles (6.1.b) | table `appointments` (Supabase) | **À VALIDER** (voir §2) |
| Formulaire de contact | prénom, nom, email, téléphone facultatif, objet, message | répondre | intérêt légitime (6.1.f) | **non stocké** : transmis par email à l'équipe (Resend) | durée de conservation de la boîte mail de l'équipe |
| Anti-abus | adresse IP, adresse email (compteurs) | protéger les formulaires | intérêt légitime (6.1.f) | table `rate_limit_events` | 24 h, purge horaire |
| Comptes de l'équipe | nom, email, rôle, permissions | accès au dashboard | exécution du contrat / intérêt légitime | `auth.users`, `profiles` | durée de la collaboration |
| Journal d'audit | identifiants d'acteurs, actions, compteurs, adresse IP de l'acteur | traçabilité, sécurité | intérêt légitime (6.1.f) | table `audit_logs` (immuable) | **À VALIDER** (voir §6) |

Le journal d'audit ne contient **aucune coordonnée de client** : l'effacement d'un client n'a donc rien à y modifier.

## 2. Durées de conservation

| Donnée | Durée | Mécanisme |
|---|---|---|
| Compteurs anti-abus (IP, email) | 24 h | fonction SQL `purge_rate_limit_events()`, planifiée **chaque heure** (pg_cron) ; le limiteur en purge aussi une partie au fil de l'eau |
| Rendez-vous | **durée non validée** | fonction SQL `anonymize_expired_appointments()`, planifiée **chaque nuit à 03:45 UTC** (pg_cron). **Sans effet tant que `data_retention_policy.appointment_retention_months` est vide.** |
| Messages de contact | non stockés | aucun |

### Activer l'anonymisation des rendez-vous

1. Faire valider la durée par le client (nombre de mois après la date du rendez-vous).
2. Appliquer la migration `0018_data_retention.sql` (`supabase db push`) et vérifier que `pg_cron` est activé
   (Dashboard Supabase, Database, Extensions). Sans lui, la migration émet un avertissement et rien n'est planifié.
3. Enregistrer la durée en base (éditeur SQL ou, une fois P6.4 livré, l'écran Paramètres) :

   ```sql
   update public.data_retention_policy set appointment_retention_months = 36;  -- exemple, à remplacer
   ```

4. **Reporter la même valeur** dans `src/data/legal.ts` (`legal.retention.appointmentsMonths`) : la politique de
   confidentialité annonce alors la durée réelle. Tant que la valeur est `null`, la page emploie une formulation générale
   qui n'annonce aucun chiffre.
5. Vérifier : `select public.anonymize_expired_appointments();` renvoie le nombre de rendez-vous traités.

L'anonymisation **conserve la ligne** (service, créneau, statut : utiles aux statistiques et à l'intégrité des créneaux) mais
remplace le nom par « Anonymisé », l'email par `anonyme-<id>@anonymized.invalid`, vide le téléphone et les notes, et
**renouvelle le jeton d'accès** (les liens « annuler / modifier » déjà envoyés ne donnent plus accès à rien).

## 3. Droit d'accès (art. 15) : exporter les données d'une personne

À exécuter par un admin disposant du droit `appointments.export`, ou directement dans l'éditeur SQL Supabase :

```sql
select public.export_client_data('personne@example.com');
```

Renvoie un JSON : tous les rendez-vous non anonymisés de cette adresse (nom, email, téléphone, notes, service, date, heure,
statut, langue). L'adresse est comparée sans tenir compte de la casse ni des espaces. **Chaque export est tracé** dans le
journal d'audit (`EXPORT_GENERATED`, avec l'auteur et le nombre de lignes, sans adresse email).

Les données hors de la base ne sont pas couvertes par cette fonction : messages de contact dans la boîte mail de l'équipe,
journaux de Resend (voir §6). À rechercher à la main.

## 4. Droit à l'effacement (art. 17)

À exécuter par un admin disposant du droit `appointments.delete`, ou dans l'éditeur SQL :

```sql
select public.erase_client_data('personne@example.com');
-- {"anonymized": 2, "cancelled": 1}
```

- Les rendez-vous **à venir** de cette adresse sont d'abord **annulés** et leur créneau est **libéré** (un rendez-vous ne peut
  pas rester actif au nom d'une personne anonymisée : l'équipe ne pourrait plus la joindre).
- Tous ses rendez-vous sont ensuite **anonymisés** (voir §2).
- L'effacement est tracé (`CLIENT_DATA_ERASED`, compteurs uniquement : le journal ne doit pas recréer la donnée effacée).
- La fonction est **idempotente** : la relancer ne retraite rien.

Ne pas utiliser `deleteAppointmentAction` pour un effacement RGPD : c'est une suppression dure d'un rendez-vous, sans la
logique ci-dessus.

## 5. Procédure à suivre pour une demande reçue

1. **Accuser réception** et **vérifier l'identité** du demandeur (réponse depuis l'adresse concernée, ou pièce justificative
   raisonnable). Ne pas communiquer de données à quelqu'un dont l'identité n'est pas établie.
2. **Répondre dans un délai d'un mois** (art. 12.3), prolongeable de deux mois pour une demande complexe, avec information
   du demandeur.
3. Accès : lancer `export_client_data`, **chercher aussi** dans la boîte mail de l'équipe, puis transmettre le tout dans un
   format lisible.
4. Effacement : lancer `erase_client_data`, supprimer les échanges d'emails concernés de la boîte de l'équipe sauf
   obligation légale de les conserver, puis confirmer au demandeur.
5. Consigner la demande et la réponse (date, nature, résultat) dans le registre interne de l'entreprise.
6. En cas de refus ou de désaccord, rappeler au demandeur son droit de réclamation auprès de l'Autorité de protection des
   données (rue de la Presse 35, 1000 Bruxelles, `contact@apd-gba.be`).

## 6. Limites connues (à connaître, pas à cacher)

- **Sauvegardes** : les sauvegardes de la base contiennent les données telles qu'elles étaient avant anonymisation, jusqu'à
  leur rotation (durée propre au plan Supabase). Un effacement n'est donc complet qu'après cette rotation.
- **Journal d'audit** : il est immuable par conception (triggers de la migration `0009`) et contient l'adresse IP des
  actions de l'équipe et des évènements de connexion. Aucune purge n'est planifiée. **À VALIDER** : durée de conservation de
  ces adresses IP, puis mécanisme d'anonymisation des adresses IP anciennes.
- **Resend** conserve des journaux d'envoi (destinataire, objet) selon sa propre politique : à vérifier dans le tableau de
  bord Resend.
- **Rendez-vous créés par un admin** : enregistrés en français (`locale = 'fr'`), et concernés par l'anonymisation comme les
  autres.
- **Pas de boîte de réception du formulaire de contact** : un message perdu côté boîte mail de l'équipe est définitivement
  perdu. Envisager une table `contact_messages` avec durée de conservation (décision client).
- Aucune interface du dashboard n'appelle encore `export_client_data` / `erase_client_data` : les fonctions sont prêtes et
  testées (pgTAP), l'écran reste à écrire si le client veut les déclencher sans SQL.

## 7. Cookies et stockage local

| Élément | Type | Pourquoi | Consentement |
|---|---|---|---|
| `byb-theme` (localStorage) | préférence d'interface | mémoriser le thème clair / sombre choisi par le visiteur | non requis (choix explicite de l'utilisateur) |
| `NEXT_LOCALE` (cookie, next-intl) | préférence de langue | mémoriser la langue | non requis (fonctionnel) |
| bulle WhatsApp (sessionStorage) | préférence d'interface | ne pas réafficher la bulle fermée pendant la visite | non requis |
| session Supabase (cookies) | authentification | connexion des **admins** uniquement | non requis (strictement nécessaire) |
| Cloudflare Turnstile | anti-robot | protéger les formulaires | non requis (sécurité) |
| Google Maps (iframe) | contenu tiers | afficher la carte | **chargé uniquement au clic** (`ConsentMap`) |

Le site n'utilise **aucun outil de mesure d'audience ni de publicité**, d'où l'absence de bandeau de consentement.
Les polices sont **hébergées par le site** (`next/font`) : un `@import` vers `fonts.googleapis.com` (qui figurait dans
`globals.css`) transmettait l'adresse IP de chaque visiteur à Google.

> **Si un outil de mesure d'audience, un pixel publicitaire, ou une vidéo intégrée (YouTube...) est ajouté un jour**, un
> bandeau de consentement devient obligatoire **avant** son chargement, et la politique de confidentialité doit être
> mise à jour. Le test `src/lib/noThirdPartyRequests.test.ts` échoue si le code charge Google Fonts, un outil de mesure ou
> un pixel connu, ou intègre une iframe autre que `ConsentMap`.

## 8. Informations à obtenir du client (BLOQUÉ tant qu'elles manquent)

| Information | Où elle s'affiche | État |
|---|---|---|
| Forme juridique (SRL, SA...) | mentions légales, politique de confidentialité (`company.legalForm`) | **manquante** : le nom est affiché sans forme juridique |
| Durée de conservation des rendez-vous | politique de confidentialité, anonymisation planifiée | **non validée** : formulation générale, aucune anonymisation automatique |
| Hébergeur du site | mentions légales (`legal.host`) | **non arrêté** (P11.2) : section masquée. Non exigée par le droit belge, mais à renseigner si affichée |
| Entité de médiation / règlement extrajudiciaire des litiges | mentions légales (`legal.mediation`) | **à décider** : section masquée |
| Adresse de contact dédiée aux questions de données | politique de confidentialité | l'adresse actuelle (`company.contact.email`) est une adresse Gmail : à remplacer par une adresse du domaine de l'entreprise |
| Localisation des données chez chaque sous-traitant (région Supabase, Resend, Cloudinary) et contrats de traitement (DPA) | politique de confidentialité (« transferts hors EEE ») | **à vérifier** : le texte reste général tant que les régions ne sont pas confirmées |
| Date de révision de la politique | `PRIVACY_POLICY_UPDATED_AT` dans `src/data/legal.ts` | à mettre à jour à chaque révision du texte |

## 9. Où se trouve quoi

| Sujet | Fichiers |
|---|---|
| Anonymisation, export, effacement, purge, politique de conservation | `supabase/migrations/0018_data_retention.sql`, tests `supabase/tests/data_retention.test.sql` |
| Données légales (sous-traitants, autorité, durées) | `src/data/legal.ts` |
| Pages | `src/app/[locale]/(public)/{politique-confidentialite,mentions-legales}/page.tsx`, textes `messages/*.json` (`privacy.*`, `legal.*`) |
| Carte avec consentement | `src/components/contact/ConsentMap.tsx` |
| Liens vers la politique sous les formulaires | `src/components/legal/privacyLink.tsx` |
| Garde-fou « aucune requête tierce » | `src/lib/noThirdPartyRequests.test.ts`, `e2e/legal-pages.spec.ts` |
