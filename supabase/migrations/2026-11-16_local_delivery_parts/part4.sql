-- Take With — local delivery migration, PART 4 of 5.
-- Run the 5 parts in order (1 to 5). Each part is safe to run again.
-- Same content as ../2026-11-16_local_delivery.sql, split so it is easy to copy on a phone.

-- Delivery jobs cannot be proposed in chat: a courier takes them with accept_delivery.
create or replace function public.propose_deal(p_conversation uuid, p_weight numeric) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_conv conversations;
  v_listing listings;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_logged_in'; end if;
  select * into v_conv from conversations where id = p_conversation;
  if not found or v_uid not in (v_conv.starter_id, v_conv.owner_id) then raise exception 'not_allowed'; end if;
  if not has_accepted_rules() then raise exception 'rules_not_accepted'; end if;
  if blocked_between(v_conv.starter_id, v_conv.owner_id) then raise exception 'blocked'; end if;
  select * into v_listing from listings where id = v_conv.listing_id;
  if v_listing.kind = 'delivery' then raise exception 'courier_required'; end if;
  if v_listing.status <> 'active' then raise exception 'listing_not_active'; end if;

  insert into deals (conversation_id, listing_id, traveller_id, sender_id, proposed_by, weight_kg)
  values (
    v_conv.id,
    v_listing.id,
    case when v_listing.kind = 'trip' then v_conv.owner_id else v_conv.starter_id end,
    case when v_listing.kind = 'trip' then v_conv.starter_id else v_conv.owner_id end,
    v_uid,
    p_weight
  )
  returning id into v_id;

  insert into messages (conversation_id, sender_id, kind, body) values (v_conv.id, v_uid, 'system', 'deal_proposed');
  return v_id;
end;
$$;

-- Same as before, plus: delivery jobs are picked up with delivery_pickup (photo required),
-- and a cancelled delivery job becomes visible to other couriers again.
create or replace function public.deal_action(
  p_deal uuid, p_action text, p_inspected boolean default false, p_reason text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_deal deals;
  v_kind text;
  v_new text;
begin
  if v_uid is null then raise exception 'not_logged_in'; end if;
  select * into v_deal from deals where id = p_deal for update;
  if not found or v_uid not in (v_deal.traveller_id, v_deal.sender_id) then raise exception 'not_allowed'; end if;
  select kind into v_kind from listings where id = v_deal.listing_id;

  if p_action = 'accept' then
    if v_deal.status <> 'proposed' or v_deal.proposed_by = v_uid then raise exception 'invalid_step'; end if;
    v_new := 'accepted';
    update deals set status = v_new where id = p_deal;
  elsif p_action = 'hand_over' then
    if v_kind = 'delivery' then raise exception 'photo_required'; end if;
    if v_deal.status <> 'accepted' or v_deal.traveller_id <> v_uid then raise exception 'invalid_step'; end if;
    if p_inspected is not true then raise exception 'inspection_required'; end if;
    v_new := 'handed_over';
    update deals set status = v_new, inspected_at = now() where id = p_deal;
  elsif p_action = 'deliver' then
    if v_deal.status <> 'handed_over' or v_deal.sender_id <> v_uid then raise exception 'invalid_step'; end if;
    v_new := 'delivered';
    update deals set status = v_new, delivered_at = now() where id = p_deal;
    update profiles set deals_completed = deals_completed + 1
    where id in (v_deal.traveller_id, v_deal.sender_id);
  elsif p_action = 'cancel' then
    if v_deal.status not in ('proposed', 'accepted') then raise exception 'invalid_step'; end if;
    v_new := 'cancelled';
    update deals set status = v_new, cancel_reason = left(p_reason, 300) where id = p_deal;
    if v_kind = 'delivery' then
      update listings set status = 'active' where id = v_deal.listing_id and status = 'closed';
    end if;
  else
    raise exception 'unknown_action';
  end if;

  insert into messages (conversation_id, sender_id, kind, body)
  values (v_deal.conversation_id, v_uid, 'system', 'deal_' || v_new);
  return v_new;
end;
$$;

