import { distanceKm } from './cities';
import { supabase } from './supabase';
import type { Conversation, Deal, Filters, Listing, Message, Place, Profile, Review } from './types';

const AUTHOR =
  'author:profiles!listings_author_id_fkey(id,display_name,avatar_url,rating_avg,rating_count,deals_completed)';
const CONVERSATION =
  '*, listing:listings(id,kind,origin_name,origin_country,dest_name,dest_country,travel_date,weight_kg,status),' +
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
    .gte('travel_date', f.dateFrom || today())
    .order('travel_date', { ascending: true })
    .limit(300);
  if (f.dateTo) q = q.lte('travel_date', f.dateTo);
  const kg = parseFloat(f.kg.replace(',', '.'));
  if (kg > 0) q = f.kind === 'trip' ? q.gte('weight_kg', kg) : q.lte('weight_kg', kg);
  if (f.itemType) q = q.contains('item_types', [f.itemType]);
  if (f.origin) {
    const b = box(f.origin, f.radiusKm);
    q = q.gte('origin_lat', b.minLat).lte('origin_lat', b.maxLat).gte('origin_lng', b.minLng).lte('origin_lng', b.maxLng);
  }
  if (f.dest) {
    const b = box(f.dest, f.radiusKm);
    q = q.gte('dest_lat', b.minLat).lte('dest_lat', b.maxLat).gte('dest_lng', b.minLng).lte('dest_lng', b.maxLng);
  }
  const { data, error } = await q;
  if (error) throw error;
  let rows = (data ?? []) as unknown as Listing[];
  const { origin, dest, radiusKm } = f;
  if (origin) rows = rows.filter((l) => distanceKm(origin.lat, origin.lng, l.origin_lat, l.origin_lng) <= radiusKm);
  if (dest) rows = rows.filter((l) => distanceKm(dest.lat, dest.lng, l.dest_lat, l.dest_lng) <= radiusKm);
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

export async function deleteAccount() {
  const { error } = await supabase.rpc('delete_account');
  if (error) throw error;
  await supabase.auth.signOut();
}
