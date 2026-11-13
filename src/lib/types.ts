export type Kind = 'trip' | 'request';

export const ITEM_TYPES = [
  'documents', 'clothes', 'gifts', 'electronics', 'medicine_otc', 'food', 'books', 'other',
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export type DealStatus = 'proposed' | 'accepted' | 'handed_over' | 'delivered' | 'cancelled';

export interface Place {
  name: string;
  country: string;
  lat: number;
  lng: number;
  ar?: string;
}

export interface PublicProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  rating_avg: number;
  rating_count: number;
  deals_completed: number;
}

export interface Profile extends PublicProfile {
  bio: string;
  languages: string[];
  accepted_rules_at: string | null;
  created_at: string;
}

export interface Listing {
  id: string;
  author_id: string;
  kind: Kind;
  origin_name: string;
  origin_country: string;
  origin_lat: number;
  origin_lng: number;
  dest_name: string;
  dest_country: string;
  dest_lat: number;
  dest_lng: number;
  travel_date: string;
  flex_days: number;
  weight_kg: number;
  item_types: ItemType[];
  description: string;
  status: 'active' | 'closed' | 'removed';
  created_at: string;
  author?: PublicProfile | null;
}

export interface Conversation {
  id: string;
  listing_id: string;
  starter_id: string;
  owner_id: string;
  last_message: string | null;
  last_message_at: string;
  listing?: Pick<Listing, 'id' | 'kind' | 'origin_name' | 'origin_country' | 'dest_name' | 'dest_country' | 'travel_date' | 'weight_kg' | 'status'> | null;
  starter?: Pick<PublicProfile, 'id' | 'display_name' | 'avatar_url'> | null;
  owner?: Pick<PublicProfile, 'id' | 'display_name' | 'avatar_url'> | null;
}

export interface Message {
  id: number;
  conversation_id: string;
  sender_id: string | null;
  kind: 'text' | 'system';
  body: string;
  created_at: string;
}

export interface Deal {
  id: string;
  conversation_id: string;
  listing_id: string;
  traveller_id: string;
  sender_id: string;
  proposed_by: string;
  weight_kg: number;
  status: DealStatus;
  inspected_at: string | null;
  delivered_at: string | null;
  cancel_reason: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  deal_id: string;
  author_id: string;
  target_id: string;
  rating: number;
  comment: string;
  created_at: string;
  author?: Pick<PublicProfile, 'id' | 'display_name' | 'avatar_url'> | null;
}

export interface Filters {
  kind: Kind;
  origin: Place | null;
  dest: Place | null;
  radiusKm: number;
  dateFrom: string;
  dateTo: string;
  kg: string;
  itemType: ItemType | null;
}
