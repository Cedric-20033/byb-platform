-- supabase/migrations/0012_reschedule_and_delete_appointment.sql
--
-- Replanification et suppression d'un rendez-vous (P4.3, P4.4).
--
-- Chaque opération touche plusieurs lignes (deux créneaux et un rendez-vous, ou un rendez-vous et
-- son créneau) : les faire depuis l'application en plusieurs requêtes laisserait un état incohérent
-- en cas d'échec partiel. Une fonction = une transaction.
--
-- SECURITY INVOKER : les fonctions s'exécutent avec les droits de l'appelant, la RLS de 0006 reste
-- donc la barrière (appointments.edit / appointments.delete ; la mise à jour des créneaux est permise
-- par slots_update_admin à qui gère les rendez-vous). Aucune élévation de privilèges.
--
-- Erreurs : `raise exception '<CODE>'` ; l'application traduit le message en code d'erreur stable.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Replanification : libère l'ancien créneau, réserve le nouveau
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.reschedule_appointment(p_appointment_id uuid, p_new_slot_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
  v_new_slot_id uuid;
begin
  -- FOR UPDATE : deux replanifications simultanées du même rendez-vous s'exécutent l'une après l'autre.
  select * into v_appointment from public.appointments where id = p_appointment_id for update;
  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  if v_appointment.status = 'cancelled' then
    raise exception 'INVALID_STATUS_TRANSITION';
  end if;

  if v_appointment.slot_id = p_new_slot_id then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  -- UPDATE conditionnel : une seule requête concurrente peut réserver le créneau visé.
  update public.slots
     set status = 'booked'
   where id = p_new_slot_id
     and status = 'available'
     and service_id = v_appointment.service_id
  returning id into v_new_slot_id;

  if v_new_slot_id is null then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  update public.appointments set slot_id = p_new_slot_id where id = p_appointment_id;

  update public.slots set status = 'available' where id = v_appointment.slot_id;
  -- Aucune ligne : la RLS a filtré la mise à jour. On annule tout plutôt que de laisser l'ancien créneau réservé.
  if not found then
    raise exception 'FORBIDDEN';
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Suppression : retire le rendez-vous et libère son créneau s'il était actif
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.delete_appointment(p_appointment_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
begin
  delete from public.appointments where id = p_appointment_id returning * into v_appointment;
  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  -- Un rendez-vous annulé a déjà libéré son créneau, éventuellement repris depuis : on n'y touche pas.
  if v_appointment.status <> 'cancelled' then
    update public.slots set status = 'available' where id = v_appointment.slot_id;
    if not found then
      raise exception 'FORBIDDEN';
    end if;
  end if;
end;
$$;

revoke all on function public.reschedule_appointment(uuid, uuid) from public, anon;
revoke all on function public.delete_appointment(uuid) from public, anon;

grant execute on function public.reschedule_appointment(uuid, uuid) to authenticated;
grant execute on function public.delete_appointment(uuid) to authenticated;
