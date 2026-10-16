-- supabase/tests/rolling_slot_generation.test.sql
--
-- Tests pgTAP de la génération glissante des créneaux (P4.8, migration 0014) : jours ouvrés, congés,
-- idempotence, services archivés, règles désactivées et verrouillage de la table de règles.
-- Lancement : `npm run test:db`. Tout est annulé en fin de transaction.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path to public, extensions;

select plan(11);

create function public.tap_as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fixtures
-- ─────────────────────────────────────────────────────────────────────────────
-- 2099-03-02 est un lundi. Horizon de 7 jours : la fonction couvre `aujourd'hui` → `aujourd'hui + 7` INCLUS,
-- soit du lundi 2 au lundi 9 mars (8 jours). Jours ouvrés : lun. 2, mar. 3, mer. 4, jeu. 5, ven. 6 et lun. 9 = 6 jours,
-- dont le mercredi 4 est un congé : il reste 5 jours ouverts × 2 créneaux = 10 créneaux.

insert into public.services (id, slug, name, short_description, full_description, icon, is_active, "order") values
  ('97000000-0000-0000-0000-00000000000a', 'actif',    '{"fr":"Actif"}',    '{"fr":"a"}', '{"fr":"a"}', 'Hammer', true,  0),
  ('97000000-0000-0000-0000-00000000000b', 'archive',  '{"fr":"Archivé"}',  '{"fr":"a"}', '{"fr":"a"}', 'Hammer', false, 1),
  ('97000000-0000-0000-0000-00000000000c', 'desactive','{"fr":"Désactivé"}','{"fr":"a"}', '{"fr":"a"}', 'Hammer', true,  2);

insert into public.slot_generation_rules (service_id, working_days, daily_start_time, daily_end_time, slot_minutes, horizon_days, is_enabled) values
  ('97000000-0000-0000-0000-00000000000a', '{1,2,3,4,5}', '08:00', '10:00', 60, 7, true),
  ('97000000-0000-0000-0000-00000000000b', '{1,2,3,4,5}', '08:00', '10:00', 60, 7, true),
  ('97000000-0000-0000-0000-00000000000c', '{1,2,3,4,5}', '08:00', '10:00', 60, 7, false);

-- Congé le mercredi 4 mars : aucun créneau ce jour-là.
insert into public.holidays (date, end_date, label, is_recurring) values ('2099-03-04', '2099-03-04', 'Congé test', false);

-- ─────────────────────────────────────────────────────────────────────────────
-- Génération
-- ─────────────────────────────────────────────────────────────────────────────

select is(
  public.generate_rolling_slots('2099-03-02'), 10,
  '5 jours ouvrés ouverts (6 moins le congé) x 2 créneaux = 10 créneaux créés'
);

select is(
  (select count(*)::int from public.slots where service_id = '97000000-0000-0000-0000-00000000000a'), 10,
  'les créneaux sont rattachés au service actif'
);

select is(
  (select count(*)::int from public.slots where service_id = '97000000-0000-0000-0000-00000000000a' and date = '2099-03-04'), 0,
  'aucun créneau un jour de congé'
);

select is(
  (select count(*)::int from public.slots where service_id = '97000000-0000-0000-0000-00000000000a' and extract(dow from date) in (0, 6)), 0,
  'aucun créneau un jour non ouvré (week-end)'
);

select is(
  (select count(*)::int from public.slots where service_id = '97000000-0000-0000-0000-00000000000b'), 0,
  'un service archivé n''est pas alimenté'
);

select is(
  (select count(*)::int from public.slots where service_id = '97000000-0000-0000-0000-00000000000c'), 0,
  'une règle désactivée ne génère rien'
);

select is(
  (select array_agg(start_time::text order by start_time) from public.slots
    where service_id = '97000000-0000-0000-0000-00000000000a' and date = '2099-03-02'),
  array['08:00:00', '09:00:00'],
  'les créneaux d''une journée suivent les horaires et la durée de la règle'
);

select is(
  public.generate_rolling_slots('2099-03-02'), 0,
  'relancer la génération ne crée aucun doublon (idempotent)'
);

-- Un horaire de début déjà présent n'est pas recréé, même avec une durée différente.
delete from public.slots where service_id = '97000000-0000-0000-0000-00000000000a' and date = '2099-03-09' and start_time = '09:00';
update public.slots set end_time = '08:30' where service_id = '97000000-0000-0000-0000-00000000000a' and date = '2099-03-09' and start_time = '08:00';

select is(
  public.generate_rolling_slots('2099-03-02'), 1,
  'seul le créneau supprimé est recréé ; celui dont la durée a changé est conservé'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Droits
-- ─────────────────────────────────────────────────────────────────────────────

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'plain-admin@test.local');

select public.tap_as_user('00000000-0000-0000-0000-0000000000e1');

select is(
  (select count(*)::int from public.slot_generation_rules), 0,
  'un admin sans le droit settings.view ne voit aucune règle (RLS)'
);

select throws_ok(
  $$select public.generate_rolling_slots('2099-03-02')$$,
  '42501', null, 'la fonction de génération n''est pas appelable depuis le navigateur'
);

select * from finish();
rollback;
