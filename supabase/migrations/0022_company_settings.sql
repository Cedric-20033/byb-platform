-- supabase/migrations/0022_company_settings.sql
--
-- Réglages de l'entreprise : P6.4 (écran /dashboard/settings).
--
-- Une SEULE ligne (clé booléenne forcée à `true`, même principe que `data_retention_policy` en 0018). Elle
-- regroupe ce que le client doit pouvoir changer sans développeur : coordonnées, sites, horaires, réseaux
-- sociaux, email qui reçoit les notifications, et paramètres de réservation.
--
-- Pas de ligne d'amorçage : tant qu'elle n'existe pas, l'application retombe sur `src/data/company.ts`
-- (valeurs actuelles du site), et le premier enregistrement depuis l'écran crée la ligne. Aucune donnée
-- à recopier à la main dans l'éditeur SQL.
--
-- Pas de lecture publique : la ligne contient l'email de notification interne. Le site public lit les
-- champs d'affichage côté serveur (client service_role), jamais depuis le navigateur.
--
-- Instructions idempotentes.

create table if not exists public.company_settings (
  id boolean primary key default true check (id),

  -- Coordonnées affichées sur le site. Chaîne vide = non renseigné.
  phone text not null default '',
  mobile text not null default '',
  email text not null check (btrim(email) <> ''),
  website text not null default '',

  -- Réseaux sociaux : URL complète, chaîne vide = lien masqué sur le site.
  facebook_url text not null default '',
  instagram_url text not null default '',
  linkedin_url text not null default '',

  -- Horaires d'ouverture traduisibles { fr, en?, de? } (français obligatoire).
  opening_hours jsonb not null check (coalesce(opening_hours ->> 'fr', '') <> ''),

  -- Sites : tableau [{ id, name, isPrimary, street, postalCode, city, country: { fr, en?, de? } }].
  -- En jsonb plutôt qu'en table : 1 à 5 lignes lues d'un bloc, jamais interrogées une à une.
  sites jsonb not null check (jsonb_typeof(sites) = 'array' and jsonb_array_length(sites) between 1 and 5),

  -- Destinataire des notifications internes (nouvelle demande, annulation, déplacement).
  admin_notification_email text not null check (btrim(admin_notification_email) <> ''),

  -- Réservation en ligne.
  booking_min_notice_minutes integer not null default 120 check (booking_min_notice_minutes between 0 and 10080),
  booking_horizon_days integer not null default 90 check (booking_horizon_days between 1 and 365),
  booking_max_upcoming_per_email integer not null default 3 check (booking_max_upcoming_per_email between 1 and 20),
  booking_confirmation_mode text not null default 'manual' check (booking_confirmation_mode in ('manual', 'auto')),
  -- Valeurs proposées par défaut au formulaire de génération de créneaux.
  booking_default_slot_minutes integer not null default 60 check (booking_default_slot_minutes between 15 and 480),
  booking_default_start_time time not null default '08:00',
  booking_default_end_time time not null default '18:00',

  updated_at timestamptz not null default now(),

  constraint company_settings_default_hours_ordered check (booking_default_start_time < booking_default_end_time)
);

drop trigger if exists set_updated_at on public.company_settings;
create trigger set_updated_at before update on public.company_settings
  for each row execute function public.set_updated_at();

alter table public.company_settings enable row level security;

-- Pas de policy de suppression : la ligne unique ne peut pas être retirée. L'insertion sert au premier
-- enregistrement ; la clé booléenne empêche toute seconde ligne.
drop policy if exists company_settings_select on public.company_settings;
create policy company_settings_select on public.company_settings
  for select to authenticated using (public.can_do('settings', 'view'));

drop policy if exists company_settings_insert on public.company_settings;
create policy company_settings_insert on public.company_settings
  for insert to authenticated with check (public.can_do('settings', 'edit'));

drop policy if exists company_settings_update on public.company_settings;
create policy company_settings_update on public.company_settings
  for update to authenticated using (public.can_do('settings', 'edit')) with check (public.can_do('settings', 'edit'));

grant select, insert, update on public.company_settings to authenticated;
