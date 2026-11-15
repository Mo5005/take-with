import { distanceKm } from './cities';
import { supabase } from './supabase';
import { Platform } from 'react-native';
import type {
  CourierApplication, Conversation, Deal, DeliveryDetails, Filters, Listing, Message, Place, Profile, Report, Review, Size,
} from './types';

const AUTHOR =
  'author:profiles!listings_author_id_fkey(id,display_name,avatar_url,rating_avg,rating_count,deals_completed)';
const CONVERSATION =
  '*, listing:listings(id,kind,origin_name,origin_country,dest_name,dest_country,travel_date,weight_kg,status,price_type,price_amount,currency,pickup_area,dropoff_area,size),' +
  ' starter:profiles!conversations_starter_id_fkey(id,display_name,avatar_url),' +
  ' owner:profiles!conversations_owner_id_fkey(id,display_name,avatar_url)';

export function today(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Turns a database error into a short code that has a translation under "errors.*". */
export function errorCode(e: unknown): string {
  const msg = (e as { message?: string } | null)?.message ?? '';
  const known = [
    'not_logged_in', 'rules_not_accepted', 'listing_not_active', 'listing_not_found', 'own_listing', 'blocked',
    'inspection_required', 'invalid_step', 'not_allowed', 'listing_limit',
    'courier_required', 'photo_required', 'photos_required', 'too_many_attempts', 'wrong_code',
  ];
  const hit = known.find((k) => msg.includes(k));
  if (hit) return hit;
  if (msg.includes('deals_one_open_idx')) return 'deal_exists';
  if (msg.includes('row-level security')) return 'not_allowed';
  if (/fetch|network/i.test(msg)) return 'network';
  if (msg.includes('schema cache') || msg.includes('does not exist')) return 'setup';
  return 'generic';
}

function box(p: Place, radiusKm: number) {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.max(0.2, Math.cos((p.lat * Math.PI) / 180)));
  return { minLat: p.lat - dLat, maxLat: p.lat + dLat, minLng: p.lng - dLng, maxLng: p.lng + dLng };
}

export async function fetchListings(f: Filters): Promise<Listing[]> {
  let q = supabase
    .from('listings')
    .select(`*, ${AUTHOR}`)
    .eq('status', 'active')
    .eq('kind', f.kind)
    .limit(300);
  if (f.kind === 'delivery') {
    // Delivery jobs disappear by themselves when their deadline has passed.
    q = q.gt('expires_at', new Date().toISOString()).order('expires_at', { ascending: true });
    if (f.size) q = q.eq('size', f.size);
  } else {
    q = q.gte('travel_date', f.dateFrom || today()).order('travel_date', { ascending: true });
    if (f.dateTo) q = q.lte('travel_date', f.dateTo);
  }
  const kg = parseFloat(f.kg.replace(',', '.'));
  if (kg > 0 && f.kind !== 'delivery') q = f.kind === 'trip' ? q.gte('weight_kg', kg) : q.lte('weight_kg', kg);
  if (f.itemType) q = q.contains('item_types', [f.itemType]);
  if (f.freeOnly) q = q.eq('price_type', 'free');
  if (f.origin) {
    const b = box(f.origin, f.kind === 'delivery' ? 40 : f.radiusKm);
    q = q.gte('origin_lat', b.minLat).lte('origin_lat', b.maxLat).gte('origin_lng', b.minLng).lte('origin_lng', b.maxLng);
  }
  if (f.dest && f.kind !== 'delivery') {
    const b = box(f.dest, f.radiusKm);
    q = q.gte('dest_lat', b.minLat).lte('dest_lat', b.maxLat).gte('dest_lng', b.minLng).lte('dest_lng', b.maxLng);
  }
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as unknown as Listing[];
  const { origin, dest } = f;
  const radiusKm = f.kind === 'delivery' ? 40 : f.radiusKm;
  if (origin) rows = rows.filter((l) => distanceKm(origin.lat, origin.lng, l.origin_lat, l.origin_lng) <= radiusKm);
  if (dest && f.kind !== 'delivery') rows = rows.filter((l) => distanceKm(dest.lat, dest.lng, l.dest_lat, l.dest_lng) <= radiusKm);
  return rows;
}

export async function fetchListing(id: string): Promise<Listing | null> {
  const { data, error } = await supabase.from('listings').select(`*, ${AUTHOR}`).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as Listing | null;
}

export async function fetchListingsByAuthor(authorId: string, onlyActive: boolean): Promise<Listing[]> {
  let q = supabase.from('listings').select('*').eq('author_id', authorId).neq('status', 'removed')
    .order('travel_date', { ascending: false }).limit(50);
  if (onlyActive) q = q.eq('status', 'active').gte('travel_date', today());
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Listing[];
}

export interface NewListing {
  kind: Listing['kind'];
  origin: Place;
  dest: Place;
  travel_date: string;
  flex_days: number;
  weight_kg: number;
  item_types: string[];
  description: string;
  price_type: Listing['price_type'];
  price_amount: number | null;
  currency: Listing['currency'];
}

export async function createListing(n: NewListing): Promise<string> {
  const { data, error } = await supabase
    .from('listings')
    .insert({
      kind: n.kind,
      origin_name: n.origin.name, origin_country: n.origin.country, origin_lat: n.origin.lat, origin_lng: n.origin.lng,
      dest_name: n.dest.name, dest_country: n.dest.country, dest_lat: n.dest.lat, dest_lng: n.dest.lng,
      travel_date: n.travel_date, flex_days: n.flex_days, weight_kg: n.weight_kg,
      item_types: n.item_types, description: n.description,
      price_type: n.price_type, price_amount: n.price_amount, currency: n.currency,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export async function setListingStatus(id: string, status: Listing['status']): Promise<void> {
  const { error } = await supabase.from('listings').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfile(id: string, patch: Partial<Pick<Profile, 'display_name' | 'bio' | 'languages' | 'accepted_rules_at'>>) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  if (error) throw error;
}

export async function fetchReviews(targetId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*, author:profiles!reviews_author_id_fkey(id,display_name,avatar_url)')
    .eq('target_id', targetId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as unknown as Review[];
}

export async function startConversation(listingId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_conversation', { p_listing: listingId });
  if (error) throw error;
  return data as string;
}

export async function fetchConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations').select(CONVERSATION).order('last_message_at', { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as Conversation[];
}

export async function fetchConversation(id: string): Promise<Conversation | null> {
  const { data, error } = await supabase.from('conversations').select(CONVERSATION).eq('id', id).maybeSingle();
  if (error) throw error;
  return data as unknown as Conversation | null;
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages').select('*').eq('conversation_id', conversationId).order('id', { ascending: true }).limit(500);
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function sendMessage(conversationId: string, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages').insert({ conversation_id: conversationId, body }).select('*').single();
  if (error) throw error;
  return data as Message;
}

/** The current deal of a chat: the open one, or the most recent one. */
export async function fetchDeal(conversationId: string): Promise<Deal | null> {
  const { data, error } = await supabase
    .from('deals').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: false }).limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as Deal | undefined) ?? null;
}

export async function proposeDeal(conversationId: string, weightKg: number): Promise<void> {
  const { error } = await supabase.rpc('propose_deal', { p_conversation: conversationId, p_weight: weightKg });
  if (error) throw error;
}

export async function dealAction(
  dealId: string, action: 'accept' | 'hand_over' | 'deliver' | 'cancel', inspected = false, reason?: string,
): Promise<void> {
  const { error } = await supabase.rpc('deal_action', {
    p_deal: dealId, p_action: action, p_inspected: inspected, p_reason: reason ?? null,
  });
  if (error) throw error;
}

export async function fetchMyReview(dealId: string, authorId: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews').select('*').eq('deal_id', dealId).eq('author_id', authorId).maybeSingle();
  if (error) throw error;
  return data as Review | null;
}

export async function createReview(dealId: string, targetId: string, rating: number, comment: string) {
  const { error } = await supabase.from('reviews').insert({ deal_id: dealId, target_id: targetId, rating, comment });
  if (error) throw error;
}

export async function createReport(targetType: string, targetId: string, reason: string, details: string) {
  const { error } = await supabase
    .from('reports').insert({ target_type: targetType, target_id: targetId, reason, details });
  if (error) throw error;
}

export async function blockUser(id: string) {
  const { error } = await supabase.from('blocks').insert({ blocked_id: id });
  if (error && !String(error.message).includes('duplicate')) throw error;
}

export async function unblockUser(me: string, id: string) {
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', me).eq('blocked_id', id);
  if (error) throw error;
}

export async function deleteAccount(userId: string) {
  // Photos are not removed together with the account by the database, so remove our own files first.
  for (const bucket of ['verification', 'listing-photos']) {
    const { data } = await supabase.storage.from(bucket).list(userId);
    if (data?.length) await supabase.storage.from(bucket).remove(data.map((f) => `${userId}/${f.name}`));
  }
  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

/** Uploads a picked image (a blob: or file: URI) and returns its path inside the bucket. */
export async function uploadImage(bucket: string, folder: string, name: string, uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  const type = blob.type || 'image/jpeg';
  const ext = type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `${folder}/${name}-${Date.now()}.${ext}`;
  const body = Platform.OS === 'web' ? blob : await blob.arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType: type, upsert: false });
  if (error) throw error;
  return path;
}

export function publicImageUrl(bucket: string, path: string): string {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** A link to a private photo that works for 10 minutes. */
export async function signedImageUrl(bucket: string, path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

// ---------------------------------------------------------------------------
// Local delivery
// ---------------------------------------------------------------------------

export interface NewDelivery {
  city: Place;
  pickup_area: string;
  dropoff_area: string;
  size: Size;
  hours: number;
  item_types: string[];
  description: string;
  price_type: Listing['price_type'];
  price_amount: number | null;
  currency: Listing['currency'];
  photo_path: string | null;
  pickup_address: string;
  pickup_phone: string;
  dropoff_address: string;
  dropoff_phone: string;
}

export async function createDelivery(n: NewDelivery): Promise<string> {
  const { data, error } = await supabase.rpc('create_delivery', {
    p_city_name: n.city.name, p_city_country: n.city.country, p_city_lat: n.city.lat, p_city_lng: n.city.lng,
    p_pickup_area: n.pickup_area, p_dropoff_area: n.dropoff_area, p_size: n.size, p_hours: n.hours,
    p_item_types: n.item_types, p_description: n.description,
    p_price_type: n.price_type, p_price_amount: n.price_amount, p_currency: n.currency, p_photo_path: n.photo_path,
    p_pickup_address: n.pickup_address, p_pickup_phone: n.pickup_phone,
    p_dropoff_address: n.dropoff_address, p_dropoff_phone: n.dropoff_phone,
  });
  if (error) throw error;
  return data as string;
}

/** Exact addresses: only returned to the author, the courier who took the job, and admins. */
export async function fetchDeliveryDetails(listingId: string): Promise<DeliveryDetails | null> {
  const { data, error } = await supabase.from('delivery_details').select('*').eq('listing_id', listingId).maybeSingle();
  if (error) throw error;
  return data as DeliveryDetails | null;
}

export async function acceptDelivery(listingId: string): Promise<string> {
  const { data, error } = await supabase.rpc('accept_delivery', { p_listing: listingId });
  if (error) throw error;
  return data as string;
}

export async function deliveryPickup(dealId: string, inspected: boolean, photoPath: string): Promise<void> {
  const { error } = await supabase.rpc('delivery_pickup', { p_deal: dealId, p_inspected: inspected, p_photo: photoPath });
  if (error) throw error;
}

/** Returns true when the code was right and the deal is now delivered. */
export async function deliveryComplete(dealId: string, code: string): Promise<boolean> {
  const { error } = await supabase.rpc('delivery_complete', { p_deal: dealId, p_code: code });
  if (error) throw error;
  const d = await supabase.from('deals').select('status').eq('id', dealId).single();
  return (d.data as { status: string } | null)?.status === 'delivered';
}

/** The delivery code. Only the sender can read it. */
export async function fetchDealCode(dealId: string): Promise<string | null> {
  const { data } = await supabase.from('deal_codes').select('code').eq('deal_id', dealId).maybeSingle();
  return (data as { code: string } | null)?.code ?? null;
}

// ---------------------------------------------------------------------------
// Couriers
// ---------------------------------------------------------------------------

export async function fetchMyApplication(userId: string): Promise<CourierApplication | null> {
  const { data, error } = await supabase.from('courier_applications').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data as CourierApplication | null;
}

export async function submitCourierApplication(a: { full_name: string; phone: string; city: string; id_photo: string; selfie: string }) {
  const { error } = await supabase.rpc('submit_courier_application', {
    p_full_name: a.full_name, p_phone: a.phone, p_city: a.city, p_id_photo: a.id_photo, p_selfie: a.selfie,
  });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export async function checkIsAdmin(): Promise<boolean> {
  const { data } = await supabase.rpc('is_admin');
  return data === true;
}

export async function fetchPendingApplications(): Promise<CourierApplication[]> {
  const { data, error } = await supabase
    .from('courier_applications').select('*').eq('status', 'pending').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CourierApplication[];
}

export async function reviewCourier(app: CourierApplication, approve: boolean, note: string) {
  const { error } = await supabase.rpc('review_courier', { p_user: app.user_id, p_approve: approve, p_note: note || null });
  if (error) throw error;
  // Data minimisation: the ID photos are deleted as soon as the decision is made.
  const paths = [app.id_photo_path, app.selfie_path].filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from('verification').remove(paths);
}

export async function fetchOpenReports(): Promise<Report[]> {
  const { data, error } = await supabase.from('reports').select('*').eq('status', 'open').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Report[];
}

export async function resolveReport(id: string, status: 'resolved' | 'rejected', resolution: string) {
  const { error } = await supabase.rpc('resolve_report', { p_report: id, p_status: status, p_resolution: resolution || null });
  if (error) throw error;
}

export async function adminRemoveListing(id: string) {
  const { error } = await supabase.rpc('admin_remove_listing', { p_listing: id });
  if (error) throw error;
}

export async function fetchActiveDeliveries(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings').select(`*, ${AUTHOR}`).eq('kind', 'delivery').neq('status', 'removed')
    .gt('expires_at', new Date(Date.now() - 86400000).toISOString()).order('expires_at', { ascending: true }).limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as Listing[];
}
