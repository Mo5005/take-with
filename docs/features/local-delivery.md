# Local delivery

## Goal
A person needs something delivered **inside one city within hours** (for example Moadamiyeh → Darayya). A **verified courier** takes the job, picks the item up and delivers it. Same app, same accounts as trips and requests.

## Phase
Test version (built 2026-11-16). Founder's decision: part of Take With, not a second app.

## User flow
**Sender**
1. Post → "Local". Choose the city, the pickup and delivery neighbourhood (public), the exact addresses and phone numbers (private), size, deadline (3 / 6 / 12 / 24 h), item type, description, optional photo, price (fixed or free).
2. The job is visible to everyone until the deadline. Only the city and neighbourhoods are public.
3. When a courier accepts, a chat opens. The sender sees a **4-digit delivery code** and gives it to the receiver.
4. The sender can follow the steps in the chat and cancel before pickup.

**Courier**
1. Profile → Courier → send full name, phone, city, ID photo and a face photo.
2. The founder checks it in Admin and approves or rejects. The ID photos are deleted right after the decision.
3. An approved courier opens a job and taps "Accept this job". Now the courier sees the exact addresses and phone numbers (tap to call).
4. At pickup: take a photo of the item, tick "I opened and checked the item", confirm. (Open-item rule.)
5. At the receiver: type the code from the receiver → delivered.
6. Both rate each other.

**Admin (founder)**
- Couriers: approve or reject applications.
- Reports: open what was reported, remove a listing, close the report.
- Deliveries: see all current local jobs.

## Steps of a delivery deal
`accepted` (courier took the job) → `handed_over` (picked up, with photo and inspection) → `delivered` (code from receiver, or the sender confirms) → ratings.
Cancel is possible before pickup; the job then becomes visible to other couriers again. After the deadline nobody can accept the job any more.

## Data
- `listings.kind = 'delivery'` with `size`, `expires_at`, `pickup_area`, `dropoff_area`, `photo_path`. City is stored in the origin and destination fields.
- `delivery_details` — exact addresses and phones. Readable only by the author, the accepted courier and admins.
- `deal_codes` — the delivery code. Readable only by the sender and admins. 10 wrong tries → only the sender can confirm.
- `courier_applications`, `profiles.courier_status` (`none` / `pending` / `approved` / `rejected`).
- `admins` — filled by hand by the founder.
- Storage buckets: `verification` (private), `listing-photos` (public), `deal-photos` (private).

## Safety and privacy
- Exact addresses never appear in public data. This is a controlled exception to product rule 2: they are shared only with the one courier who took the job.
- Only approved couriers can accept jobs (checked in the database).
- Open-item rule: pickup needs the inspection tick and a photo (checked in the database).
- No money through the app; "pay for me" does not exist.
- ID photos are sensitive personal data: only admins can see them, and they are deleted after the decision. Courier phone and name are kept. — needs legal check (GDPR, Syrian law).
- Pickup photos are kept; no automatic deletion yet.

## Not included (yet)
- Notifications (new job, accepted, auto-cancel). Couriers must open the app to see new jobs.
- Sorting by distance to the courier or by "my route" (we have no coordinates for neighbourhoods).
- Live tracking on a map, earnings history, accounts for shops.
- Phone verification by SMS or WhatsApp.

## Open questions
- How long are pickup photos kept?
- Should couriers have a limit of open jobs at the same time?
