-- Take With — database setup for the test version.
-- Run this ONCE in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- It creates the tables, the security rules (row-level security) and the server functions.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  avatar_url text,
  bio text not null default '' check (char_length(bio) <= 500),
  languages text[] not null default '{}',
  rating_avg numeric(3, 2) not null default 0,
  rating_count int not null default 0,
  deals_completed int not null default 0,
  accepted_rules_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('trip', 'request')),
  origin_name text not null check (char_length(origin_name) between 1 and 100),
  origin_country text not null check (char_length(origin_country) = 2),
  origin_lat double precision not null check (origin_lat between -90 and 90),
  origin_lng double precision not null check (origin_lng between -180 and 180),
  dest_name text not null check (char_length(dest_name) between 1 and 100),
  dest_country text not null check (char_length(dest_country) = 2),
  dest_lat double precision not null check (dest_lat between -90 and 90),
  dest_lng double precision not null check (dest_lng between -180 and 180),
  travel_date date not null,
  flex_days int not null default 0 check (flex_days between 0 and 14),
  weight_kg numeric(5, 1) not null check (weight_kg > 0 and weight_kg <= 100),
  item_types text[] not null check (
    cardinality(item_types) >= 1
    and item_types <@ array['documents', 'clothes', 'gifts', 'electronics', 'medicine_otc', 'food', 'books', 'other']
  ),
  description text not null default '' check (char_length(description) <= 1000),
  -- Price asked by the author. The app never handles money: users pay each other in cash.
  price_type text not null default 'free',
  price_amount numeric(10, 2),
  currency text,
  status text not null default 'active' check (status in ('active', 'closed', 'removed')),
  constraint listings_price_check check (
    (price_type = 'free' and price_amount is null and currency is null)
    or (price_type in ('per_kg', 'fixed') and price_amount is not null and currency is not null
      and price_amount > 0 and price_amount <= 10000000
        and currency in ('USD', 'EUR', 'SYP'))
  ),
  created_at timestamptz not null default now()
);
create index listings_browse_idx on public.listings (status, kind, travel_date);
create index listings_author_idx on public.listings (author_id);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  starter_id uuid not null references public.profiles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  last_message text,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (listing_id, starter_id),
  check (starter_id <> owner_id)
);
create index conversations_starter_idx on public.conversations (starter_id);
create index conversations_owner_idx on public.conversations (owner_id);

create table public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid default auth.uid() references public.profiles (id) on delete set null,
  kind text not null default 'text' check (kind in ('text', 'system')),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, id);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  traveller_id uuid not null references public.profiles (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  proposed_by uuid not null references public.profiles (id) on delete cascade,
  weight_kg numeric(5, 1) not null check (weight_kg > 0 and weight_kg <= 100),
  status text not null default 'proposed'
    check (status in ('proposed', 'accepted', 'handed_over', 'delivered', 'cancelled')),
  inspected_at timestamptz,
  delivered_at timestamptz,
  cancel_reason text check (char_length(cancel_reason) <= 300),
  created_at timestamptz not null default now(),
  -- Open-item rule: a deal can only be handed over (or delivered) after the traveller's inspection.
  check (status not in ('handed_over', 'delivered') or inspected_at is not null)
);
-- Only one open deal per conversation.
create unique index deals_one_open_idx on public.deals (conversation_id) where status <> 'cancelled';

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (deal_id, author_id)
);
create index reviews_target_idx on public.reviews (target_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('user', 'listing', 'conversation')),
  target_id uuid not null,
  reason text not null check (reason in ('prohibited_item', 'scam', 'harassment', 'fake', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  resolution text,
  created_at timestamptz not null default now()
);

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create function public.blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create function public.has_accepted_rules() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and accepted_rules_at is not null);
$$;

-- A profile is created automatically for every new login.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 60),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profiles for users who signed up before this script ran.
insert into public.profiles (id, display_name, avatar_url)
select id,
  left(coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', ''), 60),
  raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

-- Limit spam: at most 20 active listings per user.
create function public.check_listing_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from listings where author_id = new.author_id and status = 'active') >= 20 then
    raise exception 'listing_limit';
  end if;
  return new;
end;
$$;
create trigger listings_limit before insert on public.listings
  for each row execute function public.check_listing_limit();

-- Keep the chat list preview up to date.
create function public.on_message_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update conversations
  set last_message = case when new.kind = 'text' then left(new.body, 120) else last_message end,
      last_message_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_insert();

-- Keep the public rating of a user up to date.
create function public.on_review_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles p
  set rating_count = s.cnt, rating_avg = s.avg
  from (select count(*) as cnt, round(avg(rating), 2) as avg from reviews where target_id = new.target_id) s
  where p.id = new.target_id;
  return new;
end;
$$;
create trigger reviews_after_insert after insert on public.reviews
  for each row execute function public.on_review_insert();

-- ---------------------------------------------------------------------------
-- Server functions called by the app (RPC)
-- ---------------------------------------------------------------------------

-- Open (or reuse) the chat between the current user and the author of a listing.
create function public.start_conversation(p_listing uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_listing listings;
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_logged_in'; end if;
  select * into v_listing from listings where id = p_listing;
  if not found then raise exception 'listing_not_found'; end if;
  if v_listing.author_id = v_uid then raise exception 'own_listing'; end if;

  select id into v_id from conversations where listing_id = p_listing and starter_id = v_uid;
  if v_id is not null then return v_id; end if;

  if not has_accepted_rules() then raise exception 'rules_not_accepted'; end if;
  if v_listing.status <> 'active' then raise exception 'listing_not_active'; end if;
  if blocked_between(v_uid, v_listing.author_id) then raise exception 'blocked'; end if;

  insert into conversations (listing_id, starter_id, owner_id)
  values (p_listing, v_uid, v_listing.author_id)
  returning id into v_id;
  return v_id;
end;
$$;

-- Propose a deal inside a chat.
create function public.propose_deal(p_conversation uuid, p_weight numeric) returns uuid
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

-- Move a deal to its next step. Every status change goes through this function.
--   accept    : the other side accepts a proposed deal
--   hand_over : the traveller received the item — requires p_inspected = true (open-item rule)
--   deliver   : the sender confirms that the item arrived
--   cancel    : either side, before the item is handed over
create function public.deal_action(
  p_deal uuid, p_action text, p_inspected boolean default false, p_reason text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_deal deals;
  v_new text;
begin
  if v_uid is null then raise exception 'not_logged_in'; end if;
  select * into v_deal from deals where id = p_deal for update;
  if not found or v_uid not in (v_deal.traveller_id, v_deal.sender_id) then raise exception 'not_allowed'; end if;

  if p_action = 'accept' then
    if v_deal.status <> 'proposed' or v_deal.proposed_by = v_uid then raise exception 'invalid_step'; end if;
    v_new := 'accepted';
    update deals set status = v_new where id = p_deal;
  elsif p_action = 'hand_over' then
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
  else
    raise exception 'unknown_action';
  end if;

  insert into messages (conversation_id, sender_id, kind, body)
  values (v_deal.conversation_id, v_uid, 'system', 'deal_' || v_new);
  return v_new;
end;
$$;

-- GDPR: a user can delete the account and everything that belongs to it.
create function public.delete_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not_logged_in'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissions and row-level security
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.listings, public.reviews to anon, authenticated;
grant update (display_name, bio, languages, avatar_url, accepted_rules_at) on public.profiles to authenticated;
grant insert on public.listings to authenticated;
grant update (status, description, weight_kg, travel_date, flex_days, item_types, price_type, price_amount, currency)
  on public.listings to authenticated;
grant select on public.conversations, public.messages, public.deals, public.reports, public.blocks to authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;
grant insert (deal_id, target_id, rating, comment) on public.reviews to authenticated;
grant insert (target_type, target_id, reason, details) on public.reports to authenticated;
grant insert (blocked_id), delete on public.blocks to authenticated;
grant execute on function public.blocked_between(uuid, uuid), public.has_accepted_rules() to anon, authenticated;
grant execute on function
  public.start_conversation(uuid),
  public.propose_deal(uuid, numeric),
  public.deal_action(uuid, text, boolean, text),
  public.delete_account()
to authenticated;

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.deals enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

create policy profiles_read on public.profiles for select using (true);
create policy profiles_update_own on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy listings_read on public.listings for select
  using (status <> 'removed' or author_id = auth.uid());
create policy listings_insert_own on public.listings for insert
  with check (author_id = auth.uid() and status = 'active' and public.has_accepted_rules());
create policy listings_update_own on public.listings for update
  using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy conversations_read on public.conversations for select
  using (auth.uid() in (starter_id, owner_id));

create policy messages_read on public.messages for select
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and auth.uid() in (c.starter_id, c.owner_id)
  ));
create policy messages_insert on public.messages for insert
  with check (
    sender_id = auth.uid() and kind = 'text'
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and auth.uid() in (c.starter_id, c.owner_id)
        and not public.blocked_between(c.starter_id, c.owner_id)
    )
  );

create policy deals_read on public.deals for select
  using (auth.uid() in (traveller_id, sender_id));

create policy reviews_read on public.reviews for select using (true);
-- Reviews only from completed deals, and only about the other person in that deal.
create policy reviews_insert on public.reviews for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.deals d
      where d.id = deal_id and d.status = 'delivered'
        and ((d.traveller_id = auth.uid() and d.sender_id = target_id)
          or (d.sender_id = auth.uid() and d.traveller_id = target_id))
    )
  );

create policy reports_read_own on public.reports for select using (reporter_id = auth.uid());
create policy reports_insert_own on public.reports for insert with check (reporter_id = auth.uid());

create policy blocks_read_own on public.blocks for select using (blocker_id = auth.uid());
create policy blocks_insert_own on public.blocks for insert with check (blocker_id = auth.uid());
create policy blocks_delete_own on public.blocks for delete using (blocker_id = auth.uid());

-- Live updates in chat.
alter publication supabase_realtime add table public.messages, public.deals;

-- ===========================================================================
-- Local delivery and admin tools (same as migrations/2026-11-16_local_delivery.sql)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Listings: a third kind, "delivery" (a local delivery job inside one city)
-- ---------------------------------------------------------------------------

alter table public.listings drop constraint if exists listings_kind_check;
alter table public.listings add constraint listings_kind_check check (kind in ('trip', 'request', 'delivery'));

alter table public.listings alter column weight_kg drop not null;
alter table public.listings drop constraint if exists listings_weight_required;
alter table public.listings add constraint listings_weight_required check (kind = 'delivery' or weight_kg is not null);

alter table public.listings
  add column if not exists size text,
  add column if not exists expires_at timestamptz,
  add column if not exists pickup_area text,
  add column if not exists dropoff_area text,
  add column if not exists photo_path text;

alter table public.listings drop constraint if exists listings_delivery_check;
alter table public.listings add constraint listings_delivery_check check (
  kind <> 'delivery' or (
    size in ('small', 'medium', 'large')
    and expires_at is not null
    and char_length(pickup_area) between 1 and 80
    and char_length(dropoff_area) between 1 and 80
  )
);
alter table public.listings drop constraint if exists listings_photo_check;
alter table public.listings add constraint listings_photo_check check (char_length(photo_path) <= 200);
create index if not exists listings_delivery_idx on public.listings (status, kind, expires_at);

-- Exact addresses and phone numbers. Only the author, the courier who took the job, and admins can read them.
create table if not exists public.delivery_details (
  listing_id uuid primary key references public.listings (id) on delete cascade,
  pickup_address text not null check (char_length(pickup_address) between 3 and 300),
  pickup_phone text not null check (char_length(pickup_phone) between 5 and 30),
  dropoff_address text not null check (char_length(dropoff_address) between 3 and 300),
  dropoff_phone text not null check (char_length(dropoff_phone) between 5 and 30)
);

-- ---------------------------------------------------------------------------
-- Deals: delivery deals have no weight, but a photo taken at pickup and a delivery code
-- ---------------------------------------------------------------------------

alter table public.deals alter column weight_kg drop not null;
alter table public.deals add column if not exists pickup_photo text;

-- The code the receiver gives to the courier. Only the sender (and admins) can read it.
create table if not exists public.deal_codes (
  deal_id uuid primary key references public.deals (id) on delete cascade,
  code text not null,
  attempts int not null default 0
);

-- ---------------------------------------------------------------------------
-- Admins and courier verification
-- ---------------------------------------------------------------------------

-- The founder adds admins by hand in the SQL editor (see README).
create table if not exists public.admins (
  user_id uuid primary key references public.profiles (id) on delete cascade
);

alter table public.profiles add column if not exists courier_status text not null default 'none';
alter table public.profiles drop constraint if exists profiles_courier_status_check;
alter table public.profiles add constraint profiles_courier_status_check
  check (courier_status in ('none', 'pending', 'approved', 'rejected'));

create table if not exists public.courier_applications (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  phone text not null check (char_length(phone) between 5 and 30),
  city text not null check (char_length(city) between 1 and 100),
  id_photo_path text,
  selfie_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

create or replace function public.is_approved_courier() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and courier_status = 'approved');
$$;

-- Can the current user see the exact addresses of this listing?
create or replace function public.can_see_delivery_details(p_listing uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin()
    or exists (select 1 from listings where id = p_listing and author_id = auth.uid())
    or exists (
      select 1 from deals
      where listing_id = p_listing and traveller_id = auth.uid() and status in ('accepted', 'handed_over', 'delivered')
    );
$$;

-- Is the current user one of the two people in this deal (or an admin)? Used by the photo storage rules.
create or replace function public.can_see_deal(p_deal text) returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() or exists (
    select 1 from deals where id::text = p_deal and auth.uid() in (traveller_id, sender_id)
  );
$$;

create or replace function public.is_deal_courier(p_deal text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from deals where id::text = p_deal and traveller_id = auth.uid() and status = 'accepted');
$$;

-- Send or resend the courier application. Photos are uploaded first to the "verification" storage bucket.
create or replace function public.submit_courier_application(
  p_full_name text, p_phone text, p_city text, p_id_photo text, p_selfie text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_logged_in'; end if;
  if not has_accepted_rules() then raise exception 'rules_not_accepted'; end if;
  if (select courier_status from profiles where id = v_uid) = 'approved' then raise exception 'invalid_step'; end if;
  if p_id_photo is null or p_selfie is null
     or p_id_photo not like v_uid::text || '/%' or p_selfie not like v_uid::text || '/%' then
    raise exception 'photos_required';
  end if;
  insert into courier_applications (user_id, full_name, phone, city, id_photo_path, selfie_path, status, admin_note, created_at, reviewed_at)
  values (v_uid, trim(p_full_name), trim(p_phone), trim(p_city), p_id_photo, p_selfie, 'pending', null, now(), null)
  on conflict (user_id) do update set
    full_name = excluded.full_name, phone = excluded.phone, city = excluded.city,
    id_photo_path = excluded.id_photo_path, selfie_path = excluded.selfie_path,
    status = 'pending', admin_note = null, created_at = now(), reviewed_at = null;
  update profiles set courier_status = 'pending' where id = v_uid;
end;
$$;

-- Admin: approve or reject a courier (also used to take the approval away later).
-- The app deletes the ID photos right after the decision; only the result is kept.
create or replace function public.review_courier(p_user uuid, p_approve boolean, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not_allowed'; end if;
  update courier_applications
  set status = case when p_approve then 'approved' else 'rejected' end,
      admin_note = left(p_note, 300), reviewed_at = now(), id_photo_path = null, selfie_path = null
  where user_id = p_user;
  update profiles set courier_status = case when p_approve then 'approved' else 'rejected' end where id = p_user;
end;
$$;

-- Admin: close a report.
create or replace function public.resolve_report(p_report uuid, p_status text, p_resolution text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not_allowed'; end if;
  if p_status not in ('resolved', 'rejected') then raise exception 'invalid_step'; end if;
  update reports set status = p_status, resolution = left(p_resolution, 500) where id = p_report;
end;
$$;

-- Admin: remove any listing.
create or replace function public.admin_remove_listing(p_listing uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not_allowed'; end if;
  update listings set status = 'removed' where id = p_listing;
end;
$$;

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

-- ---------------------------------------------------------------------------
-- Permissions and row-level security
-- ---------------------------------------------------------------------------

revoke all on public.delivery_details, public.deal_codes, public.admins, public.courier_applications from anon, authenticated;
grant select on public.delivery_details, public.deal_codes, public.courier_applications to authenticated;

alter table public.delivery_details enable row level security;
alter table public.deal_codes enable row level security;
alter table public.admins enable row level security;
alter table public.courier_applications enable row level security;

drop policy if exists delivery_details_read on public.delivery_details;
create policy delivery_details_read on public.delivery_details for select
  using (public.can_see_delivery_details(listing_id));

drop policy if exists deal_codes_read on public.deal_codes;
create policy deal_codes_read on public.deal_codes for select
  using (public.is_admin() or exists (select 1 from public.deals d where d.id = deal_id and d.sender_id = auth.uid()));

drop policy if exists courier_applications_read on public.courier_applications;
create policy courier_applications_read on public.courier_applications for select
  using (user_id = auth.uid() or public.is_admin());

-- Delivery jobs are only created through create_delivery (so the addresses always exist).
drop policy if exists listings_insert_own on public.listings;
create policy listings_insert_own on public.listings for insert
  with check (author_id = auth.uid() and status = 'active' and kind <> 'delivery' and public.has_accepted_rules());

-- Admins can see every report and every deal.
drop policy if exists reports_read_admin on public.reports;
create policy reports_read_admin on public.reports for select using (public.is_admin());
drop policy if exists deals_read_admin on public.deals;
create policy deals_read_admin on public.deals for select using (public.is_admin());

revoke execute on function
  public.is_admin(), public.is_approved_courier(), public.can_see_delivery_details(uuid), public.can_see_deal(text),
  public.is_deal_courier(text),
  public.submit_courier_application(text, text, text, text, text), public.review_courier(uuid, boolean, text),
  public.resolve_report(uuid, text, text), public.admin_remove_listing(uuid),
  public.create_delivery(text, text, double precision, double precision, text, text, text, int, text[], text, text, numeric, text, text, text, text, text, text),
  public.accept_delivery(uuid), public.delivery_pickup(uuid, boolean, text), public.delivery_complete(uuid, text)
from public, anon;
grant execute on function
  public.is_admin(), public.is_approved_courier(), public.can_see_delivery_details(uuid), public.can_see_deal(text),
  public.is_deal_courier(text),
  public.submit_courier_application(text, text, text, text, text), public.review_courier(uuid, boolean, text),
  public.resolve_report(uuid, text, text), public.admin_remove_listing(uuid),
  public.create_delivery(text, text, double precision, double precision, text, text, text, int, text[], text, text, numeric, text, text, text, text, text, text),
  public.accept_delivery(uuid), public.delivery_pickup(uuid, boolean, text), public.delivery_complete(uuid, text)
to authenticated;

-- ---------------------------------------------------------------------------
-- Photo storage (Supabase Storage)
--   verification   private  <user id>/id.jpg, <user id>/selfie.jpg   owner + admins
--   listing-photos public   <user id>/<file>                         anyone can view
--   deal-photos    private  <deal id>/pickup.jpg                     the two people in the deal + admins
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('verification', 'verification', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('listing-photos', 'listing-photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('deal-photos', 'deal-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

drop policy if exists "takewith verification upload" on storage.objects;
create policy "takewith verification upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "takewith verification read" on storage.objects;
create policy "takewith verification read" on storage.objects for select to authenticated
  using (bucket_id = 'verification' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "takewith verification delete" on storage.objects;
create policy "takewith verification delete" on storage.objects for delete to authenticated
  using (bucket_id = 'verification' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists "takewith listing photo upload" on storage.objects;
create policy "takewith listing photo upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "takewith listing photo delete" on storage.objects;
create policy "takewith listing photo delete" on storage.objects for delete to authenticated
  using (bucket_id = 'listing-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "takewith deal photo upload" on storage.objects;
create policy "takewith deal photo upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'deal-photos' and public.is_deal_courier((storage.foldername(name))[1]));
drop policy if exists "takewith deal photo read" on storage.objects;
create policy "takewith deal photo read" on storage.objects for select to authenticated
  using (bucket_id = 'deal-photos' and public.can_see_deal((storage.foldername(name))[1]));
