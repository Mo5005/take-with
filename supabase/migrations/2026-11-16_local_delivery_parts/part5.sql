-- Take With — local delivery migration, PART 5 of 5.
-- Run the 5 parts in order (1 to 5). Each part is safe to run again.
-- Same content as ../2026-11-16_local_delivery.sql, split so it is easy to copy on a phone.

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
