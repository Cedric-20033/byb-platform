-- supabase/migrations/0008_permission_domains.sql
--
-- Étend la grille de permissions avec les domaines `projects`, `testimonials`
-- et `settings` (modules P6), sans toucher à 0005 (déjà appliquée : une
-- migration appliquée ne se modifie jamais).
--
-- Les tables et policies de ces modules arrivent avec P6 ; cette migration ne
-- fait que mettre à jour les droits par défaut et rattraper les admins existants.
-- Indépendante de 0007_table_grants.sql (privilèges SQL) : aucun objet en commun.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Droits par défaut d'un nouvel admin
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠ Doit rester identique à DEFAULT_ADMIN_PERMISSIONS
-- (src/domain/user/PermissionCatalog.ts) : src/lib/constants.test.ts compare les
-- deux et lit TOUJOURS la migration la plus récente qui redéfinit cette fonction.

create or replace function public.default_admin_permissions()
returns jsonb
language sql
immutable
as $fn$
  select $perms$
  {
    "appointments": { "view": true,  "create": false, "edit": false, "delete": false, "export": true  },
    "slots":        { "view": true,  "create": false, "edit": false, "delete": false, "export": false },
    "holidays":     { "view": true,  "create": true,  "edit": true,  "delete": true,  "export": false },
    "services":     { "view": true,  "create": false, "edit": false, "delete": false, "export": false },
    "projects":     { "view": true,  "create": false, "edit": false, "delete": false, "export": false },
    "testimonials": { "view": true,  "create": false, "edit": false, "delete": false, "export": false },
    "settings":     { "view": false, "create": false, "edit": false, "delete": false, "export": false },
    "users":        { "view": false, "create": false, "edit": false, "delete": false, "export": false },
    "audit_logs":   { "view": false, "create": false, "edit": false, "delete": false, "export": false }
  }
  $perms$::jsonb;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Rattrapage des admins existants
-- ─────────────────────────────────────────────────────────────────────────────
-- `||` est une fusion superficielle : les domaines déjà présents (donc éventuellement
-- réglés par le superadmin) sont conservés, seuls les domaines manquants reçoivent
-- leurs valeurs par défaut. Idempotent.

update public.profiles
   set permissions = public.default_admin_permissions() || permissions
 where role = 'admin';
