-- supabase/migrations/0014_rolling_slot_generation.sql
--
-- Génération glissante des créneaux (P4.8) : l'horizon de réservation reste rempli sans intervention.
-- Sans elle, les créneaux générés à la main s'épuisent et le calendrier public se vide un beau matin.
--
-- Deux pièces :
--   1. `slot_generation_rules` : par service, les jours ouvrés, les horaires, la durée d'un créneau et
--      l'horizon (en jours). Table créée ICI mais éditée dans l'écran de réglages (P6.4) : tant qu'aucune
--      règle n'existe, rien n'est généré (comportement actuel inchangé).
--   2. `generate_rolling_slots()` : complète l'horizon de chaque règle active, chaque nuit via pg_cron.
--
-- Pourquoi en SQL et non en rappelant `GenerateAvailableSlots` (TypeScript) : une tâche planifiée de la
-- base ne peut pas exécuter le code de l'application sans exposer une route HTTP protégée par secret (hébergement
-- non arrêté, voir P11.2). La logique dupliquée est courte ; elle respecte les mêmes règles (jours ouvrés,
-- jours fériés, pas de doublon d'horaire) et est couverte par des tests pgTAP.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Règles de génération
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.slot_generation_rules (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null unique references public.services (id) on delete cascade,
  -- Jours ouvrés au format PostgreSQL / JavaScript : 0 = dimanche … 6 = samedi.
  working_days smallint[] not null default '{1,2,3,4,5}',
  daily_start_time time not null default '08:00',
  daily_end_time time not null default '18:00',
  slot_minutes integer not null default 60 check (slot_minutes between 15 and 480),
  horizon_days integer not null default 60 check (horizon_days between 1 and 365),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slot_generation_rules_hours_ordered check (daily_start_time < daily_end_time),
  constraint slot_generation_rules_days_valid check (
    cardinality(working_days) between 1 and 7 and working_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  )
);

alter table public.slot_generation_rules enable row level security;

-- Les règles pilotent la production de créneaux : lecture et écriture réservées à qui gère les réglages
-- (le superadmin passe toujours `can_do`).
create policy slot_generation_rules_select on public.slot_generation_rules
  for select to authenticated using (public.can_do('settings', 'view'));
create policy slot_generation_rules_insert on public.slot_generation_rules
  for insert to authenticated with check (public.can_do('settings', 'edit'));
create policy slot_generation_rules_update on public.slot_generation_rules
  for update to authenticated using (public.can_do('settings', 'edit')) with check (public.can_do('settings', 'edit'));
create policy slot_generation_rules_delete on public.slot_generation_rules
  for delete to authenticated using (public.can_do('settings', 'edit'));

grant select, insert, update, delete on public.slot_generation_rules to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Génération de l'horizon
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.generate_rolling_slots(p_today date default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := coalesce(p_today, (now() at time zone 'Europe/Brussels')::date);
  v_rule record;
  v_day date;
  v_minute integer;
  v_end_minute integer;
  v_inserted integer;
  v_created_for_rule integer;
  v_total integer := 0;
begin
  for v_rule in
    select r.*
      from public.slot_generation_rules r
      join public.services s on s.id = r.service_id
     where r.is_enabled and s.is_active
  loop
    v_created_for_rule := 0;
    v_end_minute := extract(hour from v_rule.daily_end_time)::integer * 60 + extract(minute from v_rule.daily_end_time)::integer;

    for v_day in
      select d::date from generate_series(v_today, v_today + v_rule.horizon_days, interval '1 day') as d
    loop
      continue when not (extract(dow from v_day)::smallint = any (v_rule.working_days));

      -- Un jour férié ou de congé n'est jamais ouvert à la réservation. Un congé récurrent ne compare que
      -- mois/jour (sa plage ne chevauche jamais deux années : contrainte de 0013).
      continue when exists (
        select 1
          from public.holidays h
         where (not h.is_recurring and v_day between h.date and h.end_date)
            or (h.is_recurring and to_char(v_day, 'MM-DD') between to_char(h.date, 'MM-DD') and to_char(h.end_date, 'MM-DD'))
      );

      -- Les créneaux se comptent en MINUTES entières : une addition sur le type `time` reboucle à minuit
      -- et ferait boucler indéfiniment une journée qui finit à 23 h 30.
      v_minute := extract(hour from v_rule.daily_start_time)::integer * 60 + extract(minute from v_rule.daily_start_time)::integer;

      while v_minute + v_rule.slot_minutes <= v_end_minute loop
        -- Même règle que GenerateAvailableSlots (TypeScript) : on ne recrée pas un horaire de début déjà présent,
        -- même si la durée a changé depuis.
        insert into public.slots (date, start_time, end_time, status, service_id)
        select v_day,
               make_time(v_minute / 60, v_minute % 60, 0),
               make_time((v_minute + v_rule.slot_minutes) / 60, (v_minute + v_rule.slot_minutes) % 60, 0),
               'available',
               v_rule.service_id
         where not exists (
           select 1 from public.slots s
            where s.service_id = v_rule.service_id
              and s.date = v_day
              and s.start_time = make_time(v_minute / 60, v_minute % 60, 0)
         )
        on conflict do nothing;

        get diagnostics v_inserted = row_count;
        v_created_for_rule := v_created_for_rule + v_inserted;
        v_minute := v_minute + v_rule.slot_minutes;
      end loop;
    end loop;

    v_total := v_total + v_created_for_rule;

    if v_created_for_rule > 0 then
      -- Traçabilité d'une action automatique : acteur « système », sans compte. Une défaillance du journal ne doit
      -- jamais annuler la génération (même principe que SupabaseAuditLogger côté application).
      begin
        insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
        values (
          null, 'system', 'SLOT_CREATED', 'slot', null,
          jsonb_build_object(
            'serviceId', v_rule.service_id,
            'from', v_today,
            'to', v_today + v_rule.horizon_days,
            'count', v_created_for_rule,
            'automatic', true
          )
        );
      exception when others then
        raise warning 'generate_rolling_slots : journal d''audit non écrit (%)', sqlerrm;
      end;
    end if;
  end loop;

  return v_total;
end;
$$;

-- Fonction interne : exécutée par pg_cron (propriétaire) et par les tests. Aucun rôle applicatif n'y a accès,
-- elle contourne la RLS (SECURITY DEFINER) et ne doit pas être appelable depuis le navigateur.
revoke all on function public.generate_rolling_slots(date) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Planification : chaque nuit à 03:15 UTC
-- ─────────────────────────────────────────────────────────────────────────────
-- pg_cron n'est pas disponible partout (environnement de test minimal, projet sans l'extension) :
-- sans lui, la migration reste valable et la fonction peut être appelée par un autre planificateur.

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;

    -- Idempotent : on retire l'ancienne planification avant de la recréer.
    perform cron.unschedule(jobid) from cron.job where jobname = 'generate-rolling-slots';
    perform cron.schedule('generate-rolling-slots', '15 3 * * *', 'select public.generate_rolling_slots()');
  else
    raise notice 'pg_cron indisponible : la génération glissante n''est pas planifiée (activer l''extension, puis relancer cette migration).';
  end if;
end;
$$;
