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
  status text not null default 'active' check (status in ('active', 'closed', 'removed')),
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
grant update (status, description, weight_kg, travel_date, flex_days, item_types) on public.listings to authenticated;
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
