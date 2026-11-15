-- Take With — local delivery migration, PART 1 of 5.
-- Run the 5 parts in order (1 to 5). Each part is safe to run again.
-- Same content as ../2026-11-16_local_delivery.sql, split so it is easy to copy on a phone.

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

