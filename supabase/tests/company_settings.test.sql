-- supabase/tests/company_settings.test.sql
--
-- Tests pgTAP des réglages de l'entreprise (P6.4, migration 0022) : droits par action (RLS), ligne
-- unique, absence de lecture publique et contraintes de valeurs.
-- Lancement : `npm run test:db`. Tout est annulé en fin de transaction.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path to public, extensions;

select plan(15);

create function public.tap_as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- La mise à jour passe par une fonction qui compte les lignes réellement touchées : elle s'exécute avec les droits
-- de l'appelant, donc sous RLS (0 ligne = refusé en silence par la policy). La suppression n'en a pas besoin :
-- `authenticated` n'a aucun privilège DELETE sur la table (0022), Postgres la refuse avant même la RLS.
create function public.tap_update_settings() returns integer language plpgsql as $$
declare
  v_count integer;
begin
  update public.company_settings set phone = '+32 400 00 00 00';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.tap_update_settings() to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fixtures
-- ─────────────────────────────────────────────────────────────────────────────
-- plain : aucun droit   viewer : settings.view seul   editor : settings.view + edit   super : superadmin

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'plain@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'viewer@test.local'),
  ('00000000-0000-0000-0000-0000000000e3', 'editor@test.local'),
  ('00000000-0000-0000-0000-0000000000e4', 'super@test.local');

update public.profiles set permissions = '{}'::jsonb where id = '00000000-0000-0000-0000-0000000000e1';
update public.profiles set permissions = '{"settings":{"view":true}}'::jsonb where id = '00000000-0000-0000-0000-0000000000e2';
update public.profiles set permissions = '{"settings":{"view":true,"edit":true}}'::jsonb where id = '00000000-0000-0000-0000-0000000000e3';
update public.profiles set role = 'superadmin' where id = '00000000-0000-0000-0000-0000000000e4';

-- ─────────────────────────────────────────────────────────────────────────────
-- A. Création de la ligne (la table démarre vide : l'application la crée au premier enregistrement)
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000e2');

select throws_ok(
  $$insert into public.company_settings (email, opening_hours, sites, admin_notification_email)
    values ('a@byb.test', '{"fr":"Lu-Ve"}', '[{"id":"s1"}]', 'n@byb.test')$$,
  '42501', null, 'viewer : création refusée sans settings.edit'
);

select public.tap_as_user('00000000-0000-0000-0000-0000000000e3');

select lives_ok(
  $$insert into public.company_settings (email, opening_hours, sites, admin_notification_email)
    values ('a@byb.test', '{"fr":"Lu-Ve"}', '[{"id":"s1"}]', 'n@byb.test')$$,
  'editor : création autorisée avec settings.edit'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- B. Lecture, modification, suppression
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000e1');
select is((select count(*) from public.company_settings), 0::bigint, 'plain : ne voit aucune ligne');

select public.tap_as_user('00000000-0000-0000-0000-0000000000e2');
select is((select count(*) from public.company_settings), 1::bigint, 'viewer : lit les réglages');
select is(public.tap_update_settings(), 0, 'viewer : modification sans effet');

select public.tap_as_user('00000000-0000-0000-0000-0000000000e3');
select is(public.tap_update_settings(), 1, 'editor : modifie les réglages');
select throws_ok(
  $$delete from public.company_settings$$,
  '42501', null, 'editor : la ligne unique ne peut pas être supprimée (aucun privilège DELETE)'
);

select public.tap_as_user('00000000-0000-0000-0000-0000000000e4');
select is(public.tap_update_settings(), 1, 'superadmin : modifie toujours');

-- Aucune lecture publique : la ligne contient l'email de notification interne.
reset role;
set local role anon;
select throws_ok(
  $$select email from public.company_settings$$,
  '42501', null, 'anon : aucun accès à la table'
);
reset role;

-- ─────────────────────────────────────────────────────────────────────────────
-- C. Ligne unique et contraintes de valeurs (exécutées en propriétaire : seules les contraintes agissent)
-- ─────────────────────────────────────────────────────────────────────────────

select throws_ok(
  $$insert into public.company_settings (id, email, opening_hours, sites, admin_notification_email)
    values (false, 'a@byb.test', '{"fr":"x"}', '[{"id":"s1"}]', 'n@byb.test')$$,
  '23514', null, 'une seconde ligne est impossible (clé booléenne forcée à true)'
);

select throws_ok(
  $$update public.company_settings set booking_horizon_days = 0$$,
  '23514', null, 'horizon hors bornes refusé'
);

select throws_ok(
  $$update public.company_settings set booking_confirmation_mode = 'sometimes'$$,
  '23514', null, 'mode de confirmation inconnu refusé'
);

select throws_ok(
  $$update public.company_settings set sites = '[]'::jsonb$$,
  '23514', null, 'au moins un site exigé'
);

select throws_ok(
  $$update public.company_settings set opening_hours = '{"en":"Mon-Fri"}'::jsonb$$,
  '23514', null, 'horaires : le français est obligatoire'
);

select throws_ok(
  $$update public.company_settings set booking_default_start_time = '18:00', booking_default_end_time = '08:00'$$,
  '23514', null, 'début de journée avant la fin exigé'
);

select * from finish();

rollback;
