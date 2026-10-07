-- supabase/migrations/0009_audit_log_hardening.sql
--
-- Durcissement du journal d'audit pour la page « Journal d'audit » (P2).
--
-- 1. Index : la page lit le journal du plus récent au plus ancien, par pages
--    (curseur « keyset » sur (created_at, id)), avec des filtres sur l'auteur et
--    l'action. Sans ces index, chaque page déclenche un tri complet de la table,
--    qui ne fait que grossir.
--
-- 2. Immuabilité garantie PAR LA BASE. Jusqu'ici elle ne reposait que sur
--    l'absence de policy et de privilège pour anon/authenticated : le service_role
--    (le code serveur) et le propriétaire de la table pouvaient encore modifier ou
--    supprimer une ligne. Un trigger refuse désormais toute modification, quel
--    que soit le rôle.
--
--    Seule exception : `audit_logs.actor_id` est une clé étrangère `on delete set null`.
--    Supprimer un compte déclenche donc un UPDATE interne qui passe `actor_id` à NULL ;
--    il est autorisé, à condition qu'AUCUNE autre colonne ne change.
--
-- ⚠ La purge RGPD à échéance (P11) devra désactiver ce trigger explicitement, dans une
--   fonction dédiée et revue — jamais par un DELETE applicatif.
--
-- Instructions idempotentes.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Index
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc, id desc);

create index if not exists audit_logs_actor_idx
  on public.audit_logs (actor_id, created_at desc);

create index if not exists audit_logs_action_idx
  on public.audit_logs (action, created_at desc);

-- (target_type, target_id) est déjà indexé depuis 0001.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Immuabilité
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.prevent_audit_log_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Mise à jour interne de la clé étrangère (suppression d'un compte) : seule
  -- `actor_id` change, et uniquement vers NULL.
  if tg_op = 'UPDATE'
     and new.actor_id is null
     and (to_jsonb(new) - 'actor_id') = (to_jsonb(old) - 'actor_id') then
    return new;
  end if;

  raise exception 'Le journal d''audit est immuable (% refusé).', tg_op
    using errcode = '42501';
end;
$$;

drop trigger if exists audit_logs_immutable_row on public.audit_logs;
create trigger audit_logs_immutable_row
  before update or delete on public.audit_logs
  for each row execute function public.prevent_audit_log_mutation();

-- TRUNCATE ne déclenche pas les triggers « for each row » : un trigger distinct le couvre.
drop trigger if exists audit_logs_immutable_truncate on public.audit_logs;
create trigger audit_logs_immutable_truncate
  before truncate on public.audit_logs
  for each statement execute function public.prevent_audit_log_mutation();
