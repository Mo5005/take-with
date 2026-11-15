-- Take With — local delivery migration, PART 2 of 5.
-- Run the 5 parts in order (1 to 5). Each part is safe to run again.
-- Same content as ../2026-11-16_local_delivery.sql, split so it is easy to copy on a phone.

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

