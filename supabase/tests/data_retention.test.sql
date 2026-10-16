-- supabase/tests/data_retention.test.sql
--
-- Tests pgTAP de la conformité RGPD (P5.9, migration 0018) : droit d'accès, droit à l'effacement,
-- anonymisation planifiée, purge des compteurs anti-abus et verrouillage des fonctions.
-- Lancement : `npm run test:db`. Tout est annulé en fin de transaction.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path to public, extensions;

select plan(35);

create function public.tap_as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- PostgreSQL refuse un `WITH … UPDATE` imbriqué dans une sous-requête : la mise à jour passe par une fonction, qui
-- compte les lignes réellement modifiées. Elle s'exécute avec les droits de l'appelant, donc sous RLS.
create function public.tap_update_retention(p_months integer) returns integer language plpgsql as $$
declare
  v_count integer;
begin
  update public.data_retention_policy set appointment_retention_months = p_months;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Les fonctions créées par postgres ne sont pas exposées d'office aux rôles de l'API.
grant execute on function public.tap_update_retention(integer) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fixtures
-- ─────────────────────────────────────────────────────────────────────────────
-- plain : aucun droit            exporter : appointments.export seul
-- eraser : appointments.delete seul           super : superadmin

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'plain@test.local'),
  ('00000000-0000-0000-0000-0000000000f2', 'exporter@test.local'),
  ('00000000-0000-0000-0000-0000000000f3', 'eraser@test.local'),
  ('00000000-0000-0000-0000-0000000000f4', 'super@test.local');

update public.profiles set permissions = '{}'::jsonb where id = '00000000-0000-0000-0000-0000000000f1';
update public.profiles set permissions = '{"appointments":{"export":true}}'::jsonb where id = '00000000-0000-0000-0000-0000000000f2';
update public.profiles set permissions = '{"appointments":{"delete":true}}'::jsonb where id = '00000000-0000-0000-0000-0000000000f3';
update public.profiles set role = 'superadmin' where id = '00000000-0000-0000-0000-0000000000f4';

insert into public.services (id, slug, name, short_description, full_description, icon, is_active, "order") values
  ('96000000-0000-0000-0000-00000000000a', 'toiture', '{"fr":"Toiture"}', '{"fr":"a"}', '{"fr":"a"}', 'Hammer', true, 0);

insert into public.slots (id, date, start_time, end_time, status, service_id) values
  ('97000000-0000-0000-0000-000000000001', '2020-01-10', '09:00', '10:00', 'booked', '96000000-0000-0000-0000-00000000000a'),
  ('97000000-0000-0000-0000-000000000002', '2099-02-10', '09:00', '10:00', 'booked', '96000000-0000-0000-0000-00000000000a'),
  ('97000000-0000-0000-0000-000000000003', '2099-06-10', '09:00', '10:00', 'booked', '96000000-0000-0000-0000-00000000000a'),
  ('97000000-0000-0000-0000-000000000004', '2020-02-10', '09:00', '10:00', 'available', '96000000-0000-0000-0000-00000000000a');

-- a1 : Alice, passé (email en casse mixte)   a2 : Bob, à venir, récent   a3 : Alice, à venir
-- a4 : Carol, passé, déjà annulé
insert into public.appointments (id, slot_id, service_id, client_name, client_email, client_phone, notes, status, access_token) values
  ('98000000-0000-0000-0000-000000000001', '97000000-0000-0000-0000-000000000001', '96000000-0000-0000-0000-00000000000a', 'Alice', 'Alice@Test.local', '+32 470 00 00 01', 'Note d''Alice', 'confirmed', '99000000-0000-0000-0000-000000000001'),
  ('98000000-0000-0000-0000-000000000002', '97000000-0000-0000-0000-000000000002', '96000000-0000-0000-0000-00000000000a', 'Bob',   'bob@test.local',   '+32 470 00 00 02', null,           'confirmed', '99000000-0000-0000-0000-000000000002'),
  ('98000000-0000-0000-0000-000000000003', '97000000-0000-0000-0000-000000000003', '96000000-0000-0000-0000-00000000000a', 'Alice', 'alice@test.local', '+32 470 00 00 01', null,           'confirmed', '99000000-0000-0000-0000-000000000003'),
  ('98000000-0000-0000-0000-000000000004', '97000000-0000-0000-0000-000000000004', '96000000-0000-0000-0000-00000000000a', 'Carol', 'carol@test.local', '+32 470 00 00 04', null,           'cancelled', '99000000-0000-0000-0000-000000000004');

-- ─────────────────────────────────────────────────────────────────────────────
-- A. Droit d'accès : export_client_data
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000f1');

select throws_ok(
  $$select public.export_client_data('alice@test.local')$$,
  '42501', 'FORBIDDEN', 'export refusé sans le droit appointments.export'
);

select public.tap_as_user('00000000-0000-0000-0000-0000000000f2');

select is(
  jsonb_array_length(public.export_client_data('  ALICE@test.local ') -> 'appointments'), 2,
  'l''export reprend tous les rendez-vous d''une adresse, sans tenir compte de la casse ni des espaces'
);

select is(
  public.export_client_data('alice@test.local') -> 'appointments' -> 0 ->> 'name', 'Alice',
  'l''export contient les coordonnées de la personne, triées par date'
);

select is(
  jsonb_array_length(public.export_client_data('inconnu@test.local') -> 'appointments'), 0,
  'une adresse inconnue donne un export vide, sans erreur'
);

reset role;

select is(
  (select count(*)::int from public.audit_logs where action = 'EXPORT_GENERATED' and actor_id = '00000000-0000-0000-0000-0000000000f2'), 3,
  'chaque export est tracé dans le journal d''audit, avec son auteur'
);

select is(
  (select count(*)::int from public.audit_logs where action = 'EXPORT_GENERATED' and metadata::text like '%@%'), 0,
  'le journal d''un export ne contient aucune adresse email'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- B. Droit à l'effacement : erase_client_data
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000f1');

select throws_ok(
  $$select public.erase_client_data('alice@test.local')$$,
  '42501', 'FORBIDDEN', 'effacement refusé sans le droit appointments.delete'
);

select public.tap_as_user('00000000-0000-0000-0000-0000000000f2');

select throws_ok(
  $$select public.erase_client_data('alice@test.local')$$,
  '42501', 'FORBIDDEN', 'le droit d''exporter ne donne pas celui d''effacer'
);

select public.tap_as_user('00000000-0000-0000-0000-0000000000f3');

select is(
  public.erase_client_data(' ALICE@Test.local '), '{"anonymized": 2, "cancelled": 1}'::jsonb,
  'les deux rendez-vous d''Alice sont anonymisés, celui à venir est annulé'
);

reset role;

select is(
  (select status from public.appointments where id = '98000000-0000-0000-0000-000000000003'), 'cancelled',
  'le rendez-vous à venir est annulé avant d''être anonymisé'
);

select is(
  (select status from public.slots where id = '97000000-0000-0000-0000-000000000003'), 'available',
  'le créneau du rendez-vous annulé est libéré'
);

select is(
  (select client_name from public.appointments where id = '98000000-0000-0000-0000-000000000001'), 'Anonymisé',
  'le nom est remplacé'
);

select ok(
  (select client_email like 'anonyme-%@anonymized.invalid' and client_email not ilike '%alice%'
     from public.appointments where id = '98000000-0000-0000-0000-000000000001'),
  'l''adresse email est remplacée par une adresse inutilisable qui ne ressemble plus à l''originale'
);

select ok(
  (select client_phone = '' and notes is null and anonymized_at is not null
     from public.appointments where id = '98000000-0000-0000-0000-000000000001'),
  'téléphone et notes sont effacés, et l''anonymisation est datée'
);

select isnt(
  (select access_token from public.appointments where id = '98000000-0000-0000-0000-000000000001'),
  '99000000-0000-0000-0000-000000000001'::uuid,
  'le jeton est renouvelé : les liens déjà envoyés ne donnent plus accès à rien'
);

select ok(
  (select client_name = 'Bob' and anonymized_at is null from public.appointments where id = '98000000-0000-0000-0000-000000000002'),
  'les rendez-vous d''une autre personne ne sont pas touchés'
);

select is(
  (select metadata from public.audit_logs where action = 'CLIENT_DATA_ERASED' and actor_id = '00000000-0000-0000-0000-0000000000f3'),
  '{"anonymized": 2, "cancelled": 1}'::jsonb,
  'l''effacement est tracé avec son auteur et de simples compteurs'
);

select is(
  (select count(*)::int from public.audit_logs where action = 'CLIENT_DATA_ERASED' and metadata::text like '%@%'), 0,
  'le journal d''un effacement ne recrée pas la donnée effacée'
);

select public.tap_as_user('00000000-0000-0000-0000-0000000000f2');

select is(
  jsonb_array_length(public.export_client_data('alice@test.local') -> 'appointments'), 0,
  'une fois effacées, les données ne sont plus exportables'
);

reset role;

-- Un opérateur connecté directement à la base (éditeur SQL) n'a besoin d'aucun profil admin.
select lives_ok(
  $$select public.erase_client_data('personne@test.local')$$,
  'un opérateur de la base peut appeler la fonction sans compte admin'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- C. Anonymisation planifiée
-- ─────────────────────────────────────────────────────────────────────────────

select is(
  public.anonymize_expired_appointments('2099-03-01'), 0,
  'sans durée de conservation validée, rien n''est anonymisé'
);

update public.data_retention_policy set appointment_retention_months = 12;

select is(
  public.anonymize_expired_appointments('2099-03-01'), 1,
  'avec 12 mois : seul le rendez-vous plus ancien qu''un an (Carol) est anonymisé'
);

select is(
  (select client_name from public.appointments where id = '98000000-0000-0000-0000-000000000004'), 'Anonymisé',
  'l''ancien rendez-vous est anonymisé, même annulé'
);

select ok(
  (select anonymized_at is null from public.appointments where id = '98000000-0000-0000-0000-000000000002'),
  'un rendez-vous récent reste intact'
);

select is(
  public.anonymize_expired_appointments('2099-03-01'), 0,
  'relancer la tâche ne retraite rien (idempotent)'
);

select is(
  (select count(*)::int from public.audit_logs
    where action = 'APPOINTMENTS_ANONYMIZED' and actor_role = 'system' and (metadata ->> 'count')::int = 1 and metadata::text not like '%@%'),
  1,
  'l''anonymisation automatique est tracée par l''acteur système, sans coordonnée'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- D. Purge des compteurs anti-abus
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.rate_limit_events (key, occurred_at) values
  ('t:ancien', now() - interval '25 hours'),
  ('t:recent', now() - interval '1 hour');

select is(public.purge_rate_limit_events(), 1, 'seuls les compteurs de plus de 24 h sont supprimés');

select is(
  (select count(*)::int from public.rate_limit_events where key like 't:%'), 1,
  'le compteur récent est conservé'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- E. Droits
-- ─────────────────────────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000f1');

select throws_ok(
  $$select public.anonymize_expired_appointments('2099-03-01')$$,
  '42501', null, 'la tâche d''anonymisation n''est pas appelable depuis le navigateur'
);

select throws_ok(
  $$select public.anonymize_appointments(array[]::uuid[])$$,
  '42501', null, 'le noyau d''anonymisation n''est pas appelable depuis le navigateur'
);

select throws_ok(
  $$select public.purge_rate_limit_events()$$,
  '42501', null, 'la purge des compteurs n''est pas appelable depuis le navigateur'
);

select is(
  (select count(*)::int from public.data_retention_policy), 0,
  'sans le droit settings.view, la politique de conservation est invisible (RLS)'
);

select is(
  public.tap_update_retention(1), 0,
  'sans le droit settings.edit, la politique ne peut pas être modifiée'
);

select public.tap_as_user('00000000-0000-0000-0000-0000000000f4');

select is(
  (select count(*)::int from public.data_retention_policy), 1,
  'le superadmin voit la politique de conservation'
);

select is(
  public.tap_update_retention(24), 1,
  'le superadmin peut modifier la durée de conservation'
);

select * from finish();
rollback;
