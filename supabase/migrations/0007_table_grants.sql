-- supabase/migrations/0007_table_grants.sql
--
-- Privilèges SQL explicites sur les tables de l'application.
--
-- Le RLS filtre les LIGNES, mais un rôle doit d'abord avoir le droit d'accéder
-- à la TABLE. Les projets Supabase historiques accordaient automatiquement tous
-- les droits à anon / authenticated / service_role ; une installation neuve
-- (base locale, nouveau projet, CI) ne le fait plus, et l'application y échoue
-- avec « permission denied for table ». Les migrations précédentes n'accordaient
-- rien : elles ne marchaient que par héritage de ce comportement implicite.
--
-- Ce fichier rend l'installation reproductible ET resserre les droits au strict
-- nécessaire. Le RLS reste la barrière fine. Instructions idempotentes.

-- 1. Repartir d'une base saine pour les deux rôles exposés par l'API publique
revoke all on table
  public.slots, public.appointments, public.holidays, public.profiles,
  public.audit_logs, public.services, public.sub_services, public.service_media
from anon, authenticated;

-- 2. Visiteurs anonymes : uniquement le catalogue et les disponibilités.
-- Aucun accès à appointments, profiles ni audit_logs : un visiteur qui réserve
-- passe par le service_role côté serveur.
grant select on table
  public.slots, public.holidays, public.services, public.sub_services, public.service_media
to anon;

-- 3. Comptes connectés (admins) : le RLS affine ensuite
grant select on table
  public.slots, public.appointments, public.holidays, public.profiles,
  public.audit_logs, public.services, public.sub_services, public.service_media
to authenticated;

grant insert, update, delete on table
  public.slots, public.appointments, public.holidays,
  public.services, public.sub_services, public.service_media
to authenticated;

-- profiles : mise à jour réservée au superadmin par le RLS ; le trigger
-- handle_new_user crée les profils (jamais d'INSERT/DELETE depuis l'API).
grant update on table public.profiles to authenticated;

-- audit_logs : lecture seule pour les comptes connectés. Le journal est écrit
-- par le service_role et reste immuable côté navigateur.

-- 4. service_role (code serveur : réservation publique, journal d'audit, scripts)
grant all on table
  public.slots, public.appointments, public.holidays, public.profiles,
  public.audit_logs, public.services, public.sub_services, public.service_media
to service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

-- Les futures tables restent accessibles au code serveur sans nouvelle
-- instruction ; anon/authenticated recevront leurs droits table par table,
-- dans la migration qui crée la table.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;