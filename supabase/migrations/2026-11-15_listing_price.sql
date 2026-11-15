-- Take With — migration: listings can state a price.
-- Run this in the Supabase SQL Editor if you created the database BEFORE 2026-11-15.
-- (A database created from the current supabase/schema.sql already has these columns.)
-- Safe to run more than once.

alter table public.listings
  add column if not exists price_type text not null default 'free',
  add column if not exists price_amount numeric(10, 2),
  add column if not exists currency text;

alter table public.listings drop constraint if exists listings_price_check;
alter table public.listings add constraint listings_price_check check (
  (price_type = 'free' and price_amount is null and currency is null)
  or (price_type in ('per_kg', 'fixed') and price_amount is not null and currency is not null
      and price_amount > 0 and price_amount <= 10000000
      and currency in ('USD', 'EUR', 'SYP'))
);

grant update (price_type, price_amount, currency) on public.listings to authenticated;
