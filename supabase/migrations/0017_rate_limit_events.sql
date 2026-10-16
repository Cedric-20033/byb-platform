-- supabase/migrations/0017_rate_limit_events.sql
--
-- Limitation de débit des actions publiques de réservation (P5.5) : une ligne par tentative,
-- comptée sur une fenêtre glissante par `SupabaseRateLimiter`.
--
-- La table est réservée au code serveur (clé service_role, qui contourne la RLS) : RLS activée SANS
-- aucune policy, et tous les privilèges retirés à anon et authenticated. Un visiteur ne peut donc ni
-- lire ni effacer ses propres tentatives.
--
-- Les clés (`booking:create:ip:<ip>`, `booking:create:email:<email>`…) contiennent des données
-- personnelles : le limiteur purge les lignes de plus de 24 h, bien au-delà de la fenêtre la plus longue.
--
-- Instructions idempotentes.

create table if not exists public.rate_limit_events (
  id bigint generated always as identity primary key,
  key text not null,
  occurred_at timestamptz not null default now()
);

-- Lecture d'une clé sur sa fenêtre : (key, occurred_at) ; purge : occurred_at seul.
create index if not exists rate_limit_events_key_idx
  on public.rate_limit_events (key, occurred_at desc);

create index if not exists rate_limit_events_occurred_at_idx
  on public.rate_limit_events (occurred_at);

alter table public.rate_limit_events enable row level security;

revoke all on table public.rate_limit_events from anon, authenticated;
