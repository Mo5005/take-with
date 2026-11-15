export type Kind = 'trip' | 'request' | 'delivery';

export const SIZES = ['small', 'medium', 'large'] as const;
export type Size = (typeof SIZES)[number];
export const DEADLINE_HOURS = [3, 6, 12, 24] as const;
export type CourierStatus = 'none' | 'pending' | 'approved' | 'rejected';

export const ITEM_TYPES = [
  'documents', 'clothes', 'gifts', 'electronics', 'medicine_otc', 'food', 'books', 'other',
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export type PriceType = 'free' | 'per_kg' | 'fixed';
export const CURRENCIES = ['USD', 'EUR', 'SYP'] as const;
export type Currency = (typeof CURRENCIES)[number];

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
  courier_status?: CourierStatus;
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
  weight_kg: number | null;
  item_types: ItemType[];
  description: string;
  price_type: PriceType;
  price_amount: number | null;
  currency: Currency | null;
  size: Size | null;
  expires_at: string | null;
  pickup_area: string | null;
  dropoff_area: string | null;
  photo_path: string | null;
  status: 'active' | 'closed' | 'removed';
  created_at: string;
  author?: PublicProfile | null;
}

export interface DeliveryDetails {
  listing_id: string;
  pickup_address: string;
  pickup_phone: string;
  dropoff_address: string;
  dropoff_phone: string;
}

export interface CourierApplication {
  user_id: string;
  full_name: string;
  phone: string;
  city: string;
  id_photo_path: string | null;
  selfie_path: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: 'user' | 'listing' | 'conversation';
  target_id: string;
  reason: string;
  details: string;
  status: 'open' | 'resolved' | 'rejected';
  created_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string;
  starter_id: string;
  owner_id: string;
  last_message: string | null;
  last_message_at: string;
  listing?: Pick<Listing, 'id' | 'kind' | 'origin_name' | 'origin_country' | 'dest_name' | 'dest_country' | 'travel_date' | 'weight_kg' | 'status' | 'price_type' | 'price_amount' | 'currency' | 'pickup_area' | 'dropoff_area' | 'size'> | null;
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
  weight_kg: number | null;
  status: DealStatus;
  pickup_photo: string | null;
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
  freeOnly: boolean;
  size: Size | null;
}
