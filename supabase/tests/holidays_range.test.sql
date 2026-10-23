-- supabase/tests/holidays_range.test.sql
--
-- Tests pgTAP des congés sur plage (P4.7, migration 0013) : valeur par défaut de `end_date`
-- et contraintes de cohérence. Lancement : `npm run test:db`. Tout est annulé en fin de transaction.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path to public, extensions;

select plan(6);

-- Jour unique : l'application et les anciens scripts n'envoient pas `end_date`.
insert into public.holidays (id, date, label, is_recurring)
values ('96000000-0000-0000-0000-000000000001', '2099-05-14', 'Ascension', false);

select is(
  (select end_date::text from public.holidays where id = '96000000-0000-0000-0000-000000000001'),
  '2099-05-14',
  'sans end_date, le trigger la fixe à la date de début (jour unique)'
);

-- Plage non récurrente, y compris à cheval sur deux années.
select lives_ok(
  $$insert into public.holidays (date, end_date, label, is_recurring) values ('2099-12-30', '2100-01-03', 'Fêtes', false)$$,
  'une plage non récurrente peut chevaucher deux années'
);

-- Plage annuelle dans l'année.
select lives_ok(
  $$insert into public.holidays (date, end_date, label, is_recurring) values ('2099-08-01', '2099-08-15', 'Fermeture annuelle', true)$$,
  'une plage récurrente dans la même année est acceptée'
);

select throws_ok(
  $$insert into public.holidays (date, end_date, label, is_recurring) values ('2099-08-10', '2099-08-01', 'Inversée', false)$$,
  '23514', null, 'une date de fin antérieure au début est refusée'
);

select throws_ok(
  $$insert into public.holidays (date, end_date, label, is_recurring) values ('2099-12-30', '2100-01-03', 'Récurrente à cheval', true)$$,
  '23514', null, 'une plage récurrente à cheval sur deux années est refusée'
);

-- end_date n'est jamais nulle : même passée explicitement à NULL, elle est ramenée à la date de début.
insert into public.holidays (id, date, end_date, label, is_recurring)
values ('96000000-0000-0000-0000-000000000002', '2099-06-01', null, 'Sans fin', false);

select is(
  (select end_date::text from public.holidays where id = '96000000-0000-0000-0000-000000000002'),
  '2099-06-01',
  'une end_date explicitement nulle est ramenée à la date de début'
);

select * from finish();
rollback;
