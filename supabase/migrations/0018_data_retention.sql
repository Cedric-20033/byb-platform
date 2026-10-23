-- supabase/migrations/0018_data_retention.sql
--
-- Conformité RGPD (P5.9) : conservation limitée, droit d'accès et droit à l'effacement des clients.
--
-- Trois pièces :
--   1. Anonymisation planifiée des anciens rendez-vous. La DURÉE de conservation n'est volontairement pas
--      figée ici : elle doit être validée avec le client (voir docs/RGPD.md). Elle vit dans la table
--      `data_retention_policy` ; tant qu'elle est vide, la tâche nocturne ne touche à rien.
--   2. `export_client_data(email)` : droit d'accès (art. 15 RGPD), toutes les données détenues sur une adresse.
--   3. `erase_client_data(email)` : droit à l'effacement (art. 17 RGPD).
--
-- On ANONYMISE plutôt que de supprimer : la ligne reste (service, créneau, statut) pour les statistiques et
-- l'intégrité des créneaux, mais plus rien n'identifie une personne. Le journal d'audit n'est pas concerné : il
-- ne contient aucune coordonnée de client, seulement des identifiants et des compteurs.
--
-- Instructions idempotentes.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Marqueur d'anonymisation + index de recherche par email
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.appointments add column if not exists anonymized_at timestamptz;

-- Les emails sont comparés sans tenir compte de la casse (les anciennes lignes ne sont pas toutes en minuscules).
create index if not exists appointments_email_lower_idx on public.appointments (lower(client_email));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Politique de conservation (une seule ligne)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.data_retention_policy (
  -- Clé booléenne forcée à `true` : impossible d'avoir plus d'une ligne.
  id boolean primary key default true check (id),
  -- Mois écoulés depuis la date du rendez-vous avant anonymisation. NULL = aucune anonymisation automatique.
  appointment_retention_months integer check (appointment_retention_months between 1 and 120),
  updated_at timestamptz not null default now()
);

insert into public.data_retention_policy (id) values (true) on conflict (id) do nothing;

drop trigger if exists set_updated_at on public.data_retention_policy;
create trigger set_updated_at before update on public.data_retention_policy
  for each row execute function public.set_updated_at();

alter table public.data_retention_policy enable row level security;

-- Pas de policy d'insert ni de delete : la ligne unique existe d'office et ne peut être ni dupliquée ni supprimée.
drop policy if exists data_retention_policy_select on public.data_retention_policy;
create policy data_retention_policy_select on public.data_retention_policy
  for select to authenticated using (public.can_do('settings', 'view'));

drop policy if exists data_retention_policy_update on public.data_retention_policy;
create policy data_retention_policy_update on public.data_retention_policy
  for update to authenticated using (public.can_do('settings', 'edit')) with check (public.can_do('settings', 'edit'));

grant select, update on public.data_retention_policy to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Garde des fonctions de conformité
-- ─────────────────────────────────────────────────────────────────────────────
-- Autorisé : un admin qui a le droit `appointments.<action>`, ou une personne connectée directement à la base
-- (éditeur SQL, psql) qui n'a pas pris le rôle d'un visiteur. `session_user` est le compte de connexion ; le
-- réglage `role` vaut `authenticated` ou `anon` pour toute requête passée par l'API : un visiteur ne peut donc
-- pas se faire passer pour l'opérateur.

create or replace function public.assert_client_data_permission(p_action text)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.can_do('appointments', p_action) then
    return;
  end if;

  if session_user in ('postgres', 'supabase_admin')
     and coalesce(current_setting('role', true), 'none') not in ('authenticated', 'anon', 'service_role') then
    return;
  end if;

  raise exception 'FORBIDDEN' using errcode = '42501';
end;
$$;

revoke all on function public.assert_client_data_permission(text) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Anonymisation (noyau commun)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.anonymize_appointments(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.appointments
     set client_name = 'Anonymisé',
         -- Adresse syntaxiquement valide mais qui ne mène nulle part (TLD réservé .invalid, RFC 2606).
         client_email = 'anonyme-' || id || '@anonymized.invalid',
         client_phone = '',
         notes = null,
         -- Nouveau jeton : les liens « annuler » et « modifier » déjà envoyés ne donnent plus accès à rien.
         access_token = gen_random_uuid(),
         anonymized_at = now()
   where id = any (p_ids)
     and anonymized_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.anonymize_appointments(uuid[]) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Anonymisation planifiée des anciens rendez-vous
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.anonymize_expired_appointments(p_today date default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := coalesce(p_today, (now() at time zone 'Europe/Brussels')::date);
  v_months integer;
  v_cutoff date;
  v_ids uuid[];
  v_count integer;
begin
  select appointment_retention_months into v_months from public.data_retention_policy where id;

  -- Durée non validée : on ne supprime rien par défaut.
  if v_months is null then
    return 0;
  end if;

  v_cutoff := (v_today - make_interval(months => v_months))::date;

  select coalesce(array_agg(a.id), '{}')
    into v_ids
    from public.appointments a
    join public.slots s on s.id = a.slot_id
   where a.anonymized_at is null
     and s.date < v_cutoff;

  v_count := public.anonymize_appointments(v_ids);

  if v_count > 0 then
    -- Acteur « système » ; le journal ne contient que des compteurs, jamais de coordonnées. Une défaillance du
    -- journal n'annule pas l'anonymisation (même principe que generate_rolling_slots).
    begin
      insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
      values (
        null, 'system', 'APPOINTMENTS_ANONYMIZED', 'appointment', null,
        jsonb_build_object('count', v_count, 'retentionMonths', v_months, 'before', v_cutoff, 'automatic', true)
      );
    exception when others then
      raise warning 'anonymize_expired_appointments : journal d''audit non écrit (%)', sqlerrm;
    end;
  end if;

  return v_count;
end;
$$;

revoke all on function public.anonymize_expired_appointments(date) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Droit d'accès : export des données d'une adresse email
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.export_client_data(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(p_email));
  v_rows jsonb;
begin
  perform public.assert_client_data_permission('export');

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'id', a.id,
               'bookedAt', a.created_at,
               'status', a.status,
               'language', a.locale,
               'service', coalesce(sv.name ->> 'fr', ''),
               'date', sl.date,
               'startTime', sl.start_time,
               'endTime', sl.end_time,
               'name', a.client_name,
               'email', a.client_email,
               'phone', a.client_phone,
               'notes', a.notes
             )
             order by sl.date, sl.start_time
           ),
           '[]'::jsonb
         )
    into v_rows
    from public.appointments a
    join public.slots sl on sl.id = a.slot_id
    left join public.services sv on sv.id = a.service_id
   where lower(a.client_email) = v_email
     and a.anonymized_at is null;

  -- Consulter des données personnelles est une action à tracer, au même titre que les modifier.
  begin
    insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
    values (
      auth.uid(), coalesce(public.current_role_name(), 'system'), 'EXPORT_GENERATED', 'appointment', null,
      jsonb_build_object('kind', 'client_data', 'count', jsonb_array_length(v_rows))
    );
  exception when others then
    raise warning 'export_client_data : journal d''audit non écrit (%)', sqlerrm;
  end;

  return jsonb_build_object('email', v_email, 'generatedAt', now(), 'appointments', v_rows);
end;
$$;

revoke all on function public.export_client_data(text) from public, anon;
grant execute on function public.export_client_data(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Droit à l'effacement
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.erase_client_data(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(btrim(p_email));
  v_ids uuid[];
  v_upcoming uuid[];
  v_cancelled integer := 0;
  v_anonymized integer;
begin
  perform public.assert_client_data_permission('delete');

  select coalesce(array_agg(id), '{}')
    into v_ids
    from public.appointments
   where lower(client_email) = v_email
     and anonymized_at is null;

  if cardinality(v_ids) = 0 then
    return jsonb_build_object('anonymized', 0, 'cancelled', 0);
  end if;

  -- Un rendez-vous à venir ne peut pas rester actif au nom d'une personne anonymisée : l'équipe ne pourrait plus la
  -- joindre, et le créneau resterait bloqué pour rien. On l'annule et on libère le créneau avant d'effacer.
  select coalesce(array_agg(a.id), '{}')
    into v_upcoming
    from public.appointments a
    join public.slots s on s.id = a.slot_id
   where a.id = any (v_ids)
     and a.status <> 'cancelled'
     and s.date >= (now() at time zone 'Europe/Brussels')::date;

  if cardinality(v_upcoming) > 0 then
    update public.slots
       set status = 'available'
     where id in (select slot_id from public.appointments where id = any (v_upcoming))
       and status = 'booked';

    update public.appointments set status = 'cancelled' where id = any (v_upcoming);
    get diagnostics v_cancelled = row_count;
  end if;

  v_anonymized := public.anonymize_appointments(v_ids);

  -- Aucune coordonnée dans le journal : l'effacement ne doit pas recréer, ailleurs, la donnée qu'il efface.
  begin
    insert into public.audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
    values (
      auth.uid(), coalesce(public.current_role_name(), 'system'), 'CLIENT_DATA_ERASED', 'appointment', null,
      jsonb_build_object('anonymized', v_anonymized, 'cancelled', v_cancelled)
    );
  exception when others then
    raise warning 'erase_client_data : journal d''audit non écrit (%)', sqlerrm;
  end;

  return jsonb_build_object('anonymized', v_anonymized, 'cancelled', v_cancelled);
end;
$$;

revoke all on function public.erase_client_data(text) from public, anon;
grant execute on function public.erase_client_data(text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. Purge des compteurs anti-abus
-- ─────────────────────────────────────────────────────────────────────────────
-- `rate_limit_events` (0017) contient des adresses IP et des emails. La politique de confidentialité annonce leur
-- suppression au bout de 24 h : la purge opportuniste faite par `SupabaseRateLimiter` ne le garantit pas (elle ne
-- s'exécute que quand quelqu'un soumet un formulaire), d'où cette purge planifiée, indépendante du trafic.

create or replace function public.purge_rate_limit_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.rate_limit_events where occurred_at < now() - interval '24 hours';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.purge_rate_limit_events() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. Planification
-- ─────────────────────────────────────────────────────────────────────────────
-- Même garde que 0014 : sans pg_cron la migration reste valable et les fonctions peuvent être appelées par un autre
-- planificateur. Tant que `appointment_retention_months` est vide, l'anonymisation ne fait rien.
--   • anonymisation des anciens rendez-vous : chaque nuit à 03:45 UTC ;
--   • purge des compteurs anti-abus : chaque heure.

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;

    perform cron.unschedule(jobid) from cron.job where jobname in ('anonymize-expired-appointments', 'purge-rate-limit-events');
    perform cron.schedule('anonymize-expired-appointments', '45 3 * * *', 'select public.anonymize_expired_appointments()');
    perform cron.schedule('purge-rate-limit-events', '5 * * * *', 'select public.purge_rate_limit_events()');
  else
    raise notice 'pg_cron indisponible : l''anonymisation et la purge ne sont pas planifiées (activer l''extension, puis relancer cette migration).';
  end if;
end;
$$;
