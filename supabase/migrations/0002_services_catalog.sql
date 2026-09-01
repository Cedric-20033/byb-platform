-- supabase/migrations/0002_services_catalog.sql
--
-- Catalogue des services — réplique la structure de src/data/services.ts
-- en base de données, en vue de la migration Phase 3 (Supabase repository).
--
-- Contenu : tables services / sub_services / service_media,
-- RLS alignée sur les conventions de 0001 (current_role_name / has_permission),
-- galerie médias séparée pour supporter le mix images + vidéos Cloudinary.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. SERVICES — catalogue des métiers proposés par BYB Construction
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  -- Champs i18n stockés en JSONB : { "fr": "...", "en"?: "...", "de"?: "..." }
  -- Le français est toujours présent, les autres langues sont ajoutées au fil de l'eau.
  name jsonb not null,
  short_description jsonb not null,
  full_description jsonb not null,
  icon text not null,               -- nom d'icône Lucide (ex: 'Home', 'Triangle')
  is_active boolean not null default true,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_active_order_idx on public.services(is_active, "order");

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SUB_SERVICES — sous-prestations d'un service (ex: toiture pentue / plate)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.sub_services (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  slug text not null,
  name jsonb not null,
  description jsonb not null,
  "order" integer not null default 0,
  created_at timestamptz not null default now(),
  constraint sub_services_unique_slug unique (service_id, slug)
);

create index if not exists sub_services_service_idx on public.sub_services(service_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. SERVICE_MEDIA — galerie mixte images + vidéos (Cloudinary)
-- ─────────────────────────────────────────────────────────────────────────────
-- On stocke uniquement le public_id Cloudinary, jamais une URL complète :
-- l'URL est reconstruite à l'affichage via MediaProvider.getUrl(), ce qui
-- permet de changer de fournisseur média sans toucher aux données (cf.
-- src/domain/shared/MediaProvider.ts).

create type public.media_type as enum ('image', 'video');

create table if not exists public.service_media (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  type public.media_type not null default 'image',
  public_id text not null,          -- identifiant Cloudinary (dossier/nom, sans extension)
  is_cover boolean not null default false,
  "order" integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists service_media_service_idx on public.service_media(service_id);
create index if not exists service_media_type_idx on public.service_media(service_id, type);

-- Un seul média "cover" par service.
create unique index if not exists service_media_one_cover_idx
  on public.service_media(service_id)
  where is_cover = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TRIGGER — updated_at automatique (réutilise set_updated_at de 0001)
-- ─────────────────────────────────────────────────────────────────────────────

drop trigger if exists set_updated_at on public.services;
create trigger set_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.services enable row level security;
alter table public.sub_services enable row level security;
alter table public.service_media enable row level security;

-- Lecture publique : uniquement les services actifs (site vitrine).
create policy "services_select_public"
  on public.services for select
  to anon, authenticated
  using (is_active = true);

create policy "sub_services_select_public"
  on public.sub_services for select
  to anon, authenticated
  using (
    exists (select 1 from public.services s where s.id = service_id and s.is_active = true)
  );

create policy "service_media_select_public"
  on public.service_media for select
  to anon, authenticated
  using (
    exists (select 1 from public.services s where s.id = service_id and s.is_active = true)
  );

-- Écriture : superadmin ou admin avec la permission 'services.edit'
-- (réutilise public.has_permission() défini dans 0001).
create policy "services_write_admin"
  on public.services for all
  to authenticated
  using (public.current_role_name() = 'superadmin' or public.has_permission('services', 'edit'))
  with check (public.current_role_name() = 'superadmin' or public.has_permission('services', 'edit'));

create policy "sub_services_write_admin"
  on public.sub_services for all
  to authenticated
  using (public.current_role_name() = 'superadmin' or public.has_permission('services', 'edit'))
  with check (public.current_role_name() = 'superadmin' or public.has_permission('services', 'edit'));

create policy "service_media_write_admin"
  on public.service_media for all
  to authenticated
  using (public.current_role_name() = 'superadmin' or public.has_permission('services', 'edit'))
  with check (public.current_role_name() = 'superadmin' or public.has_permission('services', 'edit'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. NOTE — lien futur avec slots / appointments
-- ─────────────────────────────────────────────────────────────────────────────
-- slots.service_id et appointments.service_id restent en `text` (slug) tant que
-- cette table n'est pas peuplée et utilisée par l'application (voir commentaire
-- dans 0001_appointments_module.sql). Une fois les données migrées ici, une
-- migration ultérieure pourra convertir ces colonnes en vraies clés étrangères
-- uuid vers services.id.
