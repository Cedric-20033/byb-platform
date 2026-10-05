-- supabase/tests/permissions_json.test.sql
--
-- Tests pgTAP (P1.6) : le RLS suit le JSON `profiles.permissions`.
-- Le superadmin coche puis décoche `services.create` sur un admin : l'effet sur
-- les droits d'écriture de cet admin est immédiat, sans reconnexion (les helpers
-- RBAC relisent `profiles` à chaque requête). Vérifie aussi qu'un admin ne peut
-- pas modifier ses propres droits.
-- Lancement : `npm run test:db`. Tout est annulé en fin de transaction.

begin;

create extension if not exists pgtap with schema extensions;
set local search_path to public, extensions;

select plan(5);

create function public.tap_as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- b1 superadmin | b2 admin (droits par défaut : services.create = false)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000b1', 'super@test.local'),
  ('00000000-0000-0000-0000-0000000000b2', 'admin@test.local');

update public.profiles set role = 'superadmin' where id = '00000000-0000-0000-0000-0000000000b1';

-- ── Avant : refusé ──────────────────────────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  $$insert into public.services (id, slug, name, short_description, full_description, icon, is_active)
    values ('10000000-0000-0000-0000-0000000000b1', 'svc-b', '{"fr":"B"}', '{"fr":"b"}', '{"fr":"b"}', 'Home', true)$$,
  '42501', null, 'admin par défaut : services.create = false → insertion refusée'
);

-- ── Le superadmin accorde services.create ───────────────────────────────────

reset role;
select public.tap_as_user('00000000-0000-0000-0000-0000000000b1');
update public.profiles
   set permissions = jsonb_set(permissions, '{services,create}', 'true')
 where id = '00000000-0000-0000-0000-0000000000b2';

reset role;
select is(
  (select (permissions -> 'services' ->> 'create')::boolean from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'),
  true, 'superadmin : peut modifier les permissions d''un admin'
);

-- ── Après : accepté, sans reconnexion ───────────────────────────────────────

select public.tap_as_user('00000000-0000-0000-0000-0000000000b2');
select lives_ok(
  $$insert into public.services (id, slug, name, short_description, full_description, icon, is_active)
    values ('10000000-0000-0000-0000-0000000000b1', 'svc-b', '{"fr":"B"}', '{"fr":"b"}', '{"fr":"b"}', 'Home', true)$$,
  'admin avec services.create : insertion acceptée immédiatement'
);

-- ── Un admin ne peut pas se donner des droits (UPDATE silencieusement refusé) ─

update public.profiles
   set permissions = jsonb_set(permissions, '{services,delete}', 'true')
 where id = '00000000-0000-0000-0000-0000000000b2';

reset role;
select is(
  (select (permissions -> 'services' ->> 'delete')::boolean from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'),
  false, 'admin : ne peut pas s''accorder services.delete (auto-élévation)'
);

-- ── Retrait : de nouveau refusé ─────────────────────────────────────────────

update public.profiles
   set permissions = jsonb_set(permissions, '{services,create}', 'false')
 where id = '00000000-0000-0000-0000-0000000000b2';

select public.tap_as_user('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  $$insert into public.services (id, slug, name, short_description, full_description, icon, is_active)
    values ('10000000-0000-0000-0000-0000000000b2', 'svc-b2', '{"fr":"B2"}', '{"fr":"b"}', '{"fr":"b"}', 'Home', true)$$,
  '42501', null, 'droit retiré par le superadmin : insertion de nouveau refusée'
);

select * from finish();
rollback;
