-- supabase/migrations/0001_appointments_module.sql
--
-- Module de prise de rendez-vous — schéma complet.
-- À exécuter dans l'éditeur SQL Supabase (ou via `supabase db push` si la CLI est utilisée).
--
-- Contenu : tables slots / appointments / holidays / audit_logs / profiles,
-- contraintes anti-double-réservation, RLS (mécanisme RBAC retenu dans la stack),
-- et fonctions RPC pour l'accès client par token.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES — complète Supabase Auth avec le rôle et les permissions RBAC
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null default 'admin' check (role in ('superadmin', 'admin')),
  -- Permissions granulaires par domaine : { "appointments": { "view": true, ... }, ... }
  -- Le superadmin ajuste ce JSONB depuis /dashboard/permissions.
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SLOTS — créneaux horaires réservables
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.slots (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  end_time time not null,
  status text not null default 'available' check (status in ('available', 'booked', 'blocked')),
  -- Référence le slug du service (src/data/services.ts) tant que les services
  -- ne sont pas eux-mêmes migrés vers Supabase (Phase 3 du site vitrine).
  -- Deviendra une vraie clé étrangère vers `services.id` à ce moment-là.
  service_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Empêche la création de deux créneaux identiques par erreur côté admin.
  constraint slots_no_duplicate unique (date, start_time, end_time, service_id)
);

create index if not exists slots_date_idx on public.slots(date);
create index if not exists slots_service_idx on public.slots(service_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. APPOINTMENTS — rendez-vous pris par les clients
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.slots(id) on delete restrict,
  service_id text not null,
  sub_service_id text,
  client_name text not null,
  client_email text not null,
  client_phone text not null,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  -- Jeton secret transmis par email au client, permettant de consulter/annuler
  -- son propre RDV sans authentification (jamais exposé via une requête publique).
  access_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rempart anti-double-réservation au niveau base de données : un même créneau
-- ne peut avoir qu'un seul rendez-vous actif (annulé = libère la place).
create unique index if not exists appointments_slot_active_unique
  on public.appointments(slot_id)
  where status <> 'cancelled';

create index if not exists appointments_status_idx on public.appointments(status);
create index if not exists appointments_email_idx on public.appointments(client_email);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. HOLIDAYS — jours fériés et congés bloquant la réservation
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  label text not null,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. AUDIT_LOGS — journal d'actions, immuable
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null check (actor_role in ('superadmin', 'admin', 'system', 'client')),
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_target_idx on public.audit_logs(target_type, target_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TRIGGER — mise à jour automatique de updated_at
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.slots;
create trigger set_updated_at before update on public.slots
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.appointments;
create trigger set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. FONCTIONS HELPER RBAC — lues depuis profiles, utilisées dans les policies RLS
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.current_role_name()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function public.has_permission(p_domain text, p_action text)
returns boolean as $$
  select coalesce(
    (
      select (permissions -> p_domain ->> p_action)::boolean
      from public.profiles
      where id = auth.uid()
    ),
    false
  );
$$ language sql stable security definer;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.slots enable row level security;
alter table public.appointments enable row level security;
alter table public.holidays enable row level security;
alter table public.audit_logs enable row level security;

-- PROFILES : chacun voit son profil ; seul le superadmin gère les autres.
create policy "profiles_select_own_or_superadmin"
  on public.profiles for select
  using (id = auth.uid() or public.current_role_name() = 'superadmin');

create policy "profiles_update_superadmin_only"
  on public.profiles for update
  using (public.current_role_name() = 'superadmin');

-- SLOTS : lecture publique (calendrier temps réel), écriture admin/superadmin
-- avec vérification de la permission granulaire.
create policy "slots_select_public"
  on public.slots for select
  to anon, authenticated
  using (true);

create policy "slots_write_admin"
  on public.slots for all
  to authenticated
  using (public.current_role_name() = 'superadmin' or public.has_permission('slots', 'edit'))
  with check (public.current_role_name() = 'superadmin' or public.has_permission('slots', 'edit'));

-- APPOINTMENTS : aucun accès direct pour anon (données personnelles → RGPD).
-- Le client passe exclusivement par les fonctions RPC token ci-dessous.
-- Les admins/superadmin consultent via leur session authentifiée + permission.
create policy "appointments_select_admin"
  on public.appointments for select
  to authenticated
  using (public.current_role_name() = 'superadmin' or public.has_permission('appointments', 'view'));

create policy "appointments_write_admin"
  on public.appointments for update
  to authenticated
  using (public.current_role_name() = 'superadmin' or public.has_permission('appointments', 'edit'))
  with check (public.current_role_name() = 'superadmin' or public.has_permission('appointments', 'edit'));

create policy "appointments_delete_admin"
  on public.appointments for delete
  to authenticated
  using (public.current_role_name() = 'superadmin' or public.has_permission('appointments', 'delete'));

-- Note : l'INSERT public (création de RDV par un visiteur non-authentifié) ne
-- passe pas par une policy RLS mais par le composition root Next.js, qui
-- utilise le service_role côté serveur (voir SupabaseAppointmentRepository,
-- étape 6). Cela évite d'exposer la table aux écritures anonymes directes.

-- HOLIDAYS : lecture publique, écriture admin/superadmin.
create policy "holidays_select_public"
  on public.holidays for select
  to anon, authenticated
  using (true);

create policy "holidays_write_admin"
  on public.holidays for all
  to authenticated
  using (public.current_role_name() = 'superadmin' or public.has_permission('holidays', 'edit'))
  with check (public.current_role_name() = 'superadmin' or public.has_permission('holidays', 'edit'));

-- AUDIT_LOGS : immuable (pas de policy update/delete = interdit par défaut).
-- Lecture réservée à qui a la permission ; écriture par le backend (service_role)
-- ou tout compte authentifié (les use cases loguent leurs propres actions).
create policy "audit_logs_select_admin"
  on public.audit_logs for select
  to authenticated
  using (public.current_role_name() = 'superadmin' or public.has_permission('audit_logs', 'view'));

create policy "audit_logs_insert_authenticated"
  on public.audit_logs for insert
  to authenticated
  with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. RPC — accès client à son propre rendez-vous via token (sans authentification)
-- ─────────────────────────────────────────────────────────────────────────────

-- Consultation : retourne les infos du RDV correspondant au token, ou rien si invalide.
-- SECURITY DEFINER : contourne délibérément le RLS ci-dessus, mais l'accès reste
-- strictement borné au token fourni — c'est la fonction elle-même qui fait office
-- de garde-fou, pas une policy de ligne.
create or replace function public.get_appointment_by_token(p_token uuid)
returns table (
  id uuid,
  status text,
  client_name text,
  service_id text,
  slot_date date,
  slot_start_time time
) as $$
  select a.id, a.status, a.client_name, a.service_id, s.date, s.start_time
  from public.appointments a
  join public.slots s on s.id = a.slot_id
  where a.access_token = p_token;
$$ language sql stable security definer;

-- Annulation : le client annule son propre RDV et libère le créneau atomiquement.
create or replace function public.cancel_appointment_by_token(p_token uuid)
returns void as $$
declare
  v_appointment public.appointments%rowtype;
begin
  select * into v_appointment from public.appointments where access_token = p_token;

  if not found then
    raise exception 'Rendez-vous introuvable ou lien invalide.';
  end if;

  if v_appointment.status = 'cancelled' then
    raise exception 'Ce rendez-vous est déjà annulé.';
  end if;

  update public.appointments
    set status = 'cancelled'
    where id = v_appointment.id;

  update public.slots
    set status = 'available'
    where id = v_appointment.slot_id;
end;
$$ language plpgsql security definer;

grant execute on function public.get_appointment_by_token(uuid) to anon, authenticated;
grant execute on function public.cancel_appointment_by_token(uuid) to anon, authenticated;
