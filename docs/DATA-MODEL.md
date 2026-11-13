# Data Model

The real tables are defined in `supabase/schema.sql` — that file is the source of truth. This page explains the ideas.

Differences in the test version:
- There is no `Place` table. A listing stores the city name, country code and coordinates itself; cities come from the list bundled in the app.
- A conversation has a `starter` (the interested user) and an `owner` (the listing author).
- Reports can target a user, a listing or a conversation.
- No photos, no ID verification, no `disputed` status yet. Capacity of a trip is not reduced automatically.

## Entities

```
User ──< Listing ──< Deal >── User
  │                    │
  │                    ├──< Message   (via Conversation)
  │                    └──< Review
  └──< Report
```

### User
`id, display_name, photo, bio, languages[], phone_verified, id_verified, rating_avg, rating_count, deals_completed, locale, created_at, status (active|suspended|banned)`

### Listing
One table for both sides, separated by `kind`.

| Field | Trip | Request |
|---|---|---|
| `kind` | `trip` | `request` |
| `author_id` | traveller | sender |
| `origin_place_id`, `destination_place_id` | ✔ | ✔ |
| `date` | travel date | latest delivery date |
| `date_flex_days` | optional | optional |
| `weight_kg` | free capacity | item weight |
| `item_types[]` | accepted types | type of the item |
| `description`, `photos[]` | optional | photo required |
| `status` | `active` \| `full` \| `expired` \| `closed` \| `removed` | same |

Listings have no price: version 1 is free only.
Listings expire automatically after their date.

### Place
`id, name (ar/de/en), country_code, lat, lng, type (city|airport), iata_code?`
World-wide list of cities and airports loaded from open data (routes are anywhere → anywhere). The user picks a place from this list — this gives clean filters and a clean map, and keeps exact addresses out of the system.

### Item types (enum)
`documents, clothes, gifts, electronics, medicine_otc, food, books, other`

### Conversation / Message
`Conversation: id, listing_id, participant_a, participant_b`
`Message: id, conversation_id, sender_id, body, image?, created_at, read_at`
One conversation per (listing, interested user).

### Deal
Created when both sides agree in a conversation.
`id, listing_id, traveller_id, sender_id, agreed_weight_kg, status, inspected_confirmed_at, delivered_confirmed_at`

```
proposed ──> accepted ──> handed_over ──> delivered ──> (reviews)
    │            │             │
    └────────────┴──> cancelled (with reason)
                               └──> disputed
```

- `accepted → handed_over` requires the traveller's inspection confirmation.
- `handed_over → delivered` confirmed by sender (v2: receiver code).
- Accepted deals reduce the remaining capacity of a trip.

### Review
`id, deal_id, author_id, target_id, rating 1–5, comment` — one per side per deal, only when status is `delivered`.

### Report
`id, reporter_id, target_type (user|listing|message), target_id, reason, details, status, resolution`

## Search and filters

- `kind` (trips / requests)
- origin, destination — exact place or within radius (e.g. Bremen + 150 km covers Hamburg, Hannover)
- date range
- minimum weight
- item type
- verified authors only
- sort: date (default), newest, rating

Map view: aggregate active listings per origin→destination pair, draw one arc per pair with a count.
