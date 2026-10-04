-- supabase/migrations/0006_granular_rls.sql
--
-- Aligne le RLS sur les permissions PAR ACTION vérifiées par l'application.
--
-- Avant : les policies d'écriture (`for all`) n'exigeaient que `<domaine>.edit`,
-- alors que l'application vérifie `create` / `edit` / `delete` séparément. Un
-- admin avec `holidays.create` mais sans `holidays.edit` passait le contrôle
-- applicatif puis échouait (ou, pire, réussissait) côté base selon l'opération.
-- Désormais chaque opération SQL exige exactement la permission correspondante :
--   INSERT → create   UPDATE → edit   DELETE → delete   SELECT → view
--
-- Autres durcissements :
--   • les services inactifs sont visibles des admins (`services.view`) ;
--   • le journal d'audit n'est plus inscriptible par un compte connecté
--     (le logger applicatif utilise le service_role) → plus de faux logs ;
--   • un admin désactivé n'a plus aucun droit (cf. helpers de 0005).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Helper : "le rôle courant peut-il faire <action> sur <domaine> ?"
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.can_do(p_domain text, p_action text)
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(public.current_role_name() = 'superadmin', false)
      or public.has_permission(p_domain, p_action);
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. SLOTS
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "slots_write_admin" on public.slots;

create policy "slots_insert_admin"
  on public.slots for insert
  to authenticated
  with check (public.can_do('slots', 'create'));

-- Mise à jour du statut d'un créneau : aussi autorisée à qui gère les rendez-vous.
-- Annuler/replanifier/créer un RDV réserve ou libère son créneau ; sans cela, un
-- admin disposant de `appointments.edit` mais pas de `slots.edit` annulait le RDV
-- sans que le créneau soit libéré (la mise à jour était refusée silencieusement).
create policy "slots_update_admin"
  on public.slots for update
  to authenticated
  using (
    public.can_do('slots', 'edit')
    or public.can_do('appointments', 'edit')
    or public.can_do('appointments', 'create')
  )
  with check (
    public.can_do('slots', 'edit')
    or public.can_do('appointments', 'edit')
    or public.can_do('appointments', 'create')
  );

create policy "slots_delete_admin"
  on public.slots for delete
  to authenticated
  using (public.can_do('slots', 'delete'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. APPOINTMENTS
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "appointments_select_admin" on public.appointments;
drop policy if exists "appointments_write_admin" on public.appointments;
drop policy if exists "appointments_delete_admin" on public.appointments;

create policy "appointments_select_admin"
  on public.appointments for select
  to authenticated
  using (public.can_do('appointments', 'view'));

-- Création manuelle d'un RDV par un admin (étape P4.2). La création publique par
-- un visiteur reste faite côté serveur avec le service_role (aucun accès anonyme).
create policy "appointments_insert_admin"
  on public.appointments for insert
  to authenticated
  with check (public.can_do('appointments', 'create'));

create policy "appointments_update_admin"
  on public.appointments for update
  to authenticated
  using (public.can_do('appointments', 'edit'))
  with check (public.can_do('appointments', 'edit'));

create policy "appointments_delete_admin"
  on public.appointments for delete
  to authenticated
  using (public.can_do('appointments', 'delete'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. HOLIDAYS
-- ─────────────────────────────────────────────────────────────────────────────

drop policy if exists "holidays_write_admin" on public.holidays;

create policy "holidays_insert_admin"
  on public.holidays for insert
  to authenticated
  with check (public.can_do('holidays', 'create'));

create policy "holidays_update_admin"
  on public.holidays for update
  to authenticated
  using (public.can_do('holidays', 'edit'))
  with check (public.can_do('holidays', 'edit'));

create policy "holidays_delete_admin"
  on public.holidays for delete
  to authenticated
  using (public.can_do('holidays', 'delete'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SERVICES, SUB_SERVICES, SERVICE_MEDIA
-- ─────────────────────────────────────────────────────────────────────────────
-- La lecture publique (0002) ne montre que les services actifs ; les admins avec
-- `services.view` voient aussi les inactifs (sinon un service désactivé
-- deviendrait impossible à réactiver depuis le dashboard).

drop policy if exists "services_write_admin" on public.services;
drop policy if exists "sub_services_write_admin" on public.sub_services;
drop policy if exists "service_media_write_admin" on public.service_media;

create policy "services_select_admin"
  on public.services for select
  to authenticated
  using (public.can_do('services', 'view'));

create policy "services_insert_admin"
  on public.services for insert
  to authenticated
  with check (public.can_do('services', 'create'));

create policy "services_update_admin"
  on public.services for update
  to authenticated
  using (public.can_do('services', 'edit'))
  with check (public.can_do('services', 'edit'));

create policy "services_delete_admin"
  on public.services for delete
  to authenticated
  using (public.can_do('services', 'delete'));

create policy "sub_services_select_admin"
  on public.sub_services for select
  to authenticated
  using (public.can_do('services', 'view'));

create policy "sub_services_insert_admin"
  on public.sub_services for insert
  to authenticated
  with check (public.can_do('services', 'create'));

create policy "sub_services_update_admin"
  on public.sub_services for update
  to authenticated
  using (public.can_do('services', 'edit'))
  with check (public.can_do('services', 'edit'));

create policy "sub_services_delete_admin"
  on public.sub_services for delete
  to authenticated
  using (public.can_do('services', 'delete'));

create policy "service_media_select_admin"
  on public.service_media for select
  to authenticated
  using (public.can_do('services', 'view'));

create policy "service_media_insert_admin"
  on public.service_media for insert
  to authenticated
  with check (public.can_do('services', 'create'));

create policy "service_media_update_admin"
  on public.service_media for update
  to authenticated
  using (public.can_do('services', 'edit'))
  with check (public.can_do('services', 'edit'));

create policy "service_media_delete_admin"
  on public.service_media for delete
  to authenticated
  using (public.can_do('services', 'delete'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. AUDIT_LOGS — lecture sous permission, écriture réservée au service_role
-- ─────────────────────────────────────────────────────────────────────────────
-- Aucune policy d'insert/update/delete pour les rôles anon/authenticated : le
-- journal est donc immuable et non falsifiable depuis un navigateur. Le
-- service_role (SupabaseAuditLogger) contourne le RLS pour y écrire.

drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;
drop policy if exists "audit_logs_select_admin" on public.audit_logs;

create policy "audit_logs_select_admin"
  on public.audit_logs for select
  to authenticated
  using (public.can_do('audit_logs', 'view'));
