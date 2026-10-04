-- supabase/migrations/0005_auth_profiles_trigger.sql
--
-- Versionne le trigger `handle_new_user` (jusqu'ici créé à la main dans la base,
-- donc absent d'une installation neuve : sans lui, `profiles` reste vide et la
-- connexion boucle en redirection) et ajoute la désactivation de compte.
--
-- Avant d'appliquer sur une base existante, comparer avec la fonction déjà
-- en place :  select pg_get_functiondef('public.handle_new_user'::regproc);
-- Cette migration la remplace (create or replace) ; elle est idempotente et un
-- éventuel second trigger historique reste inoffensif (`on conflict do nothing`).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Désactivation de compte (gérée depuis /dashboard/users, étape P1.5)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists is_active boolean not null default true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Permissions par défaut d'un nouvel admin
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠ Doit rester identique à DEFAULT_ADMIN_PERMISSIONS (src/lib/constants.ts) :
-- un test automatisé (src/lib/constants.test.ts) compare les deux et échoue
-- si elles divergent.

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
    "users":        { "view": false, "create": false, "edit": false, "delete": false, "export": false },
    "audit_logs":   { "view": false, "create": false, "edit": false, "delete": false, "export": false }
  }
  $perms$::jsonb;
$fn$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Trigger : un profil est créé automatiquement pour chaque compte Supabase Auth
-- ─────────────────────────────────────────────────────────────────────────────
-- Tout nouveau compte démarre en rôle 'admin' avec les permissions par défaut :
-- la promotion en 'superadmin' est un acte explicite (script de premier
-- démarrage, puis page Utilisateurs), jamais un effet de bord de l'inscription.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, permissions)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    'admin',
    public.default_admin_permissions()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- La fonction ne doit être appelable que par le trigger, jamais via l'API (RPC).
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Rattrapage : profils manquants pour les comptes déjà existants
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.profiles (id, email, full_name, role, permissions)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(u.email, ''), '@', 1)),
  'admin',
  public.default_admin_permissions()
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Un compte désactivé n'a plus aucun droit
-- ─────────────────────────────────────────────────────────────────────────────
-- Redéfinition des helpers RBAC de 0001 : ils ignorent désormais les profils
-- inactifs (rôle null, aucune permission), ce qui coupe d'un coup tous les
-- accès RLS d'un admin désactivé. `set search_path` fige la résolution des
-- noms (bonne pratique pour une fonction SECURITY DEFINER).

create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create or replace function public.has_permission(p_domain text, p_action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (permissions -> p_domain ->> p_action)::boolean
      from public.profiles
      where id = auth.uid() and is_active
    ),
    false
  );
$$;
