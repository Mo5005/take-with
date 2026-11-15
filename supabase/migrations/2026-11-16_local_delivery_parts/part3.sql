-- Take With — local delivery migration, PART 3 of 5.
-- Run the 5 parts in order (1 to 5). Each part is safe to run again.
-- Same content as ../2026-11-16_local_delivery.sql, split so it is easy to copy on a phone.

-- Post a delivery job: the public part and the private addresses in one step.
create or replace function public.create_delivery(
  p_city_name text, p_city_country text, p_city_lat double precision, p_city_lng double precision,
  p_pickup_area text, p_dropoff_area text, p_size text, p_hours int, p_item_types text[], p_description text,
  p_price_type text, p_price_amount numeric, p_currency text, p_photo_path text,
  p_pickup_address text, p_pickup_phone text, p_dropoff_address text, p_dropoff_phone text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_logged_in'; end if;
  if not has_accepted_rules() then raise exception 'rules_not_accepted'; end if;
  if p_hours not in (3, 6, 12, 24) then raise exception 'invalid_step'; end if;
  if p_photo_path is not null and p_photo_path not like v_uid::text || '/%' then raise exception 'not_allowed'; end if;
  insert into listings (
    author_id, kind, origin_name, origin_country, origin_lat, origin_lng, dest_name, dest_country, dest_lat, dest_lng,
    travel_date, weight_kg, item_types, description, price_type, price_amount, currency,
    size, expires_at, pickup_area, dropoff_area, photo_path
  ) values (
    v_uid, 'delivery', p_city_name, p_city_country, p_city_lat, p_city_lng, p_city_name, p_city_country, p_city_lat, p_city_lng,
    current_date, null, p_item_types, coalesce(p_description, ''), p_price_type, p_price_amount, p_currency,
    p_size, now() + make_interval(hours => p_hours), trim(p_pickup_area), trim(p_dropoff_area), p_photo_path
  ) returning id into v_id;
  insert into delivery_details (listing_id, pickup_address, pickup_phone, dropoff_address, dropoff_phone)
  values (v_id, trim(p_pickup_address), trim(p_pickup_phone), trim(p_dropoff_address), trim(p_dropoff_phone));
  return v_id;
end;
$$;

-- A verified courier takes a delivery job. Creates the chat and the deal, and the delivery code.
create or replace function public.accept_delivery(p_listing uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_listing listings;
  v_conv uuid;
  v_deal uuid;
begin
  if v_uid is null then raise exception 'not_logged_in'; end if;
  if not has_accepted_rules() then raise exception 'rules_not_accepted'; end if;
  if not is_approved_courier() then raise exception 'courier_required'; end if;
  select * into v_listing from listings where id = p_listing for update;
  if not found or v_listing.kind <> 'delivery' then raise exception 'listing_not_found'; end if;
  if v_listing.author_id = v_uid then raise exception 'own_listing'; end if;
  if v_listing.status <> 'active' or v_listing.expires_at <= now() then raise exception 'listing_not_active'; end if;
  if blocked_between(v_uid, v_listing.author_id) then raise exception 'blocked'; end if;
  if exists (select 1 from deals where listing_id = p_listing and status <> 'cancelled') then
    raise exception 'listing_not_active';
  end if;

  insert into conversations (listing_id, starter_id, owner_id)
  values (p_listing, v_uid, v_listing.author_id)
  on conflict (listing_id, starter_id) do update set last_message_at = now()
  returning id into v_conv;

  insert into deals (conversation_id, listing_id, traveller_id, sender_id, proposed_by, weight_kg, status)
  values (v_conv, p_listing, v_uid, v_listing.author_id, v_uid, null, 'accepted')
  returning id into v_deal;
  insert into deal_codes (deal_id, code) values (v_deal, lpad(floor(random() * 10000)::int::text, 4, '0'));
  update listings set status = 'closed' where id = p_listing;

  insert into messages (conversation_id, sender_id, kind, body) values (v_conv, v_uid, 'system', 'deal_accepted');
  return v_conv;
end;
$$;

-- The courier picked up the item: inspection confirmed and a photo uploaded to deal-photos/<deal id>/.
create or replace function public.delivery_pickup(p_deal uuid, p_inspected boolean, p_photo text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_deal deals;
begin
  select * into v_deal from deals where id = p_deal for update;
  if not found or v_deal.traveller_id is distinct from v_uid then raise exception 'not_allowed'; end if;
  if v_deal.status <> 'accepted' then raise exception 'invalid_step'; end if;
  if p_inspected is not true then raise exception 'inspection_required'; end if;
  if p_photo is null or p_photo not like p_deal::text || '/%' then raise exception 'photo_required'; end if;
  update deals set status = 'handed_over', inspected_at = now(), pickup_photo = p_photo where id = p_deal;
  insert into messages (conversation_id, sender_id, kind, body) values (v_deal.conversation_id, v_uid, 'system', 'deal_handed_over');
end;
$$;

-- The courier enters the code from the receiver. After 10 wrong tries only the sender can confirm.
create or replace function public.delivery_complete(p_deal uuid, p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_deal deals;
  v_code deal_codes;
begin
  select * into v_deal from deals where id = p_deal for update;
  if not found or v_deal.traveller_id is distinct from v_uid then raise exception 'not_allowed'; end if;
  if v_deal.status <> 'handed_over' then raise exception 'invalid_step'; end if;
  select * into v_code from deal_codes where deal_id = p_deal for update;
  if not found then raise exception 'invalid_step'; end if;
  if v_code.attempts >= 10 then raise exception 'too_many_attempts'; end if;
  if trim(p_code) <> v_code.code then
    update deal_codes set attempts = attempts + 1 where deal_id = p_deal;
    return;  -- the app checks the status afterwards and shows "wrong code"
  end if;
  update deals set status = 'delivered', delivered_at = now() where id = p_deal;
  update profiles set deals_completed = deals_completed + 1 where id in (v_deal.traveller_id, v_deal.sender_id);
  insert into messages (conversation_id, sender_id, kind, body) values (v_deal.conversation_id, v_uid, 'system', 'deal_delivered');
end;
$$;

