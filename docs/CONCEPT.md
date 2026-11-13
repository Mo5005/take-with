# Concept

## 1. The idea in one sentence

Travellers post the luggage space they have free on a trip; people who need something carried on that route find them, agree in chat, and hand the item over in person.

Example: Mo flies Bremen → Damascus on 12 December with 2 kg free. Layla in Bremen wants to send documents to her family in Damascus. She finds Mo's trip, messages him, they meet, Mo checks the item and carries it.

This model is known as **crowdshipping** / peer-to-peer delivery. It works best on **diaspora routes** where normal shipping is slow, expensive or unreliable — which is exactly the Germany ↔ Syria case.

## 2. Why it can work

- **Real pain:** shipping to Syria is costly and slow; people already solve this through Facebook and WhatsApp groups ("anyone flying to Damascus next week?").
- **Existing behaviour:** we are not inventing a habit, we are giving a messy one a better tool: searchable, filterable, with profiles and ratings instead of an endless group chat.
- **Dense community:** a tight community on a few routes solves the cold-start problem better than a global launch.

**Main competitor is not another app — it is the Facebook/WhatsApp group.** We win only if posting and finding is faster there and trust is visibly higher.

## 3. Users

| Role | Wants | Fears |
|---|---|---|
| **Traveller** (carrier) | Help people, maybe offset ticket cost | Carrying something illegal, customs trouble, no-shows |
| **Sender** | Cheap, fast, personal delivery | Item lost, stolen, or never delivered |
| **Receiver** (often not an app user) | Pick up easily | Not knowing when/where |

One account can be both traveller and sender. No separate account types.

## 4. Core model: two kinds of listing

The original idea covers traveller offers. A marketplace needs both sides, otherwise senders with no matching trip leave empty-handed.

- **Trip** — "I travel A → B on date X, I have N kg free." (posted by traveller)
- **Request** — "I need item Y carried A → B before date X." (posted by sender)

Both appear in the same list/map, with a toggle. A traveller can answer a request; a sender can answer a trip.

## 5. Features

### MVP (version 1)

| # | Feature | Notes |
|---|---|---|
| 1 | **Sign up / login** | Email + Google/Apple. Phone number verified by SMS (required before posting or messaging). |
| 2 | **Profile** | Name, photo, languages, short bio, verification badges, rating, completed deliveries. |
| 3 | **Post a trip** | From, to, date, free weight (kg), accepted item types, price (free / per kg / fixed), description, handover area. |
| 4 | **Post a request** | From, to, latest delivery date, item type, weight, description, photo, reward offered. |
| 5 | **Browse list** | Sorted by date. Card shows route, date, kg, price, author rating. |
| 6 | **Map view** | Routes drawn as arcs between cities; tap a city to see listings from/to it. |
| 7 | **Filters** | From, to (with radius / "nearby airports"), date range, min. weight, item type, free vs. paid, verified users only. |
| 8 | **In-app chat** | Contact the author without exposing phone number. Text + photos. |
| 9 | **Deal flow** | Request → accepted → handed over → delivered → rated. See DATA-MODEL. |
| 10 | **Ratings & reviews** | Both sides, only after a completed deal. |
| 11 | **Safety layer** | Prohibited-items list, mandatory "I inspected the item" confirmation, report & block. See TRUST-SAFETY-LEGAL. |
| 12 | **Languages** | Arabic (RTL), German, English from day one. |
| 13 | **Notifications** | New message, deal status change. |

### Version 2 (after first real users)

- **Route alerts** — "notify me when someone posts Bremen → Damascus". Probably the single strongest retention feature.
- **ID verification** badge (passport/ID check through a provider).
- **Delivery confirmation code** — receiver gives the traveller a code/QR to close the deal.
- **Receiver tracking link** — web page for the receiver without installing the app.
- **Share listing** to WhatsApp/Facebook (brings users from the groups where they are today).
- **Flexible routes** — stopovers, "I can also hand over in Hamburg".
- **Trusted circle** — mutual contacts, "delivered for 3 people you know".

### Later

- In-app payment with escrow (released on delivery confirmation).
- Optional item insurance.
- More corridors (Germany ↔ Lebanon, Türkiye, Iraq, Egypt, Jordan …).
- Shopping requests ("buy X in Germany and bring it").
- Other transport: car, bus.

### Deliberately not in the MVP

- **Payments.** Money is agreed and exchanged between users directly. Handling money makes us a payment/commercial operator with far more regulation. First prove people use it.
- **Price recommendations, insurance, logistics partners.**

## 6. Key screens

1. Onboarding (language, safety rules in 3 screens, login)
2. Home: search bar (from / to / date) + list ⇄ map toggle + trips ⇄ requests toggle
3. Filter sheet
4. Listing detail (route, date, capacity, price, author card, "Message" button)
5. Create listing (short stepper: route → date → capacity/item → price → review)
6. Chat list and chat thread (with deal status banner and action buttons)
7. My listings / my deals
8. Profile and verification
9. Safety centre (prohibited items, how to hand over safely, report)

## 7. Business model

Free at launch — growth and trust matter more than revenue. Later options, in order of fit:

1. **Service fee on paid deals** once in-app payment exists (e.g. 10 %). Free deals stay free.
2. **Verification / boost** — paid highlighted listing or fast-track ID badge.
3. **Insurance commission**.
4. **Partnerships** — travel agencies, money-transfer services, diaspora businesses.

Avoid advertising: it damages trust in a product where trust is the product.

## 8. Success metrics

- **Match rate** — % of listings that get at least one conversation (most important).
- **Completed deals** per week and per route.
- Time from posting to first message.
- Repeat users (second listing within 90 days).
- Reports per 100 deals (safety health).

## 9. Biggest risks

| Risk | Mitigation |
|---|---|
| Illegal or dangerous items carried | Safety layer, inspection rule, prohibited list, verification — see TRUST-SAFETY-LEGAL |
| Cold start (empty app) | Launch on **one corridor**, seed from existing community groups, allow requests as well as trips |
| Users move to WhatsApp after first contact | Accept it early; give reasons to return: ratings, deal history, alerts |
| Legal exposure of the platform | Clear terms: platform only connects people; legal review before public launch |
| Scams / theft | Phone verification, ratings, report & block, later ID check and escrow |
