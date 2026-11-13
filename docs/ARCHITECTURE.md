# Architecture

Goal: built by the founder with Claude, testable on a phone through a web link, native apps later from the same code, low cost while free, EU data hosting.

| Layer | Choice | Why |
|---|---|---|
| App | **Expo** (React Native, TypeScript) with **web output** | One codebase: web app now, iOS and Android later |
| Web delivery | Installable web app (PWA — a website that can be added to the phone's home screen) | Test from any phone with a link, no app store |
| App ID | `com.dumo.takewith` | Used for the iOS bundle ID and Android package later |
| Backend | **Supabase** (EU region) | Database (Postgres), login, live chat, file storage, row-level security — no own server |
| Geo | **PostGIS** | Radius search and route queries in the database |
| Places | Open world-wide city and airport data (e.g. GeoNames, OurAirports) loaded into the database | Routes are anywhere → anywhere; no paid geocoding service |
| Maps | **MapLibre** + OpenStreetMap-based tiles | No per-request Google Maps bill |
| Login | Supabase Auth: email, Google, Apple; SMS code for phone verification | Apple login is required on iOS when other social logins are offered |
| Notifications | Email first; web push and Expo push later | Web push on iPhone only works after "Add to Home Screen" |
| Languages | i18next, `ar` / `de` / `en`, right-to-left layouts | |
| Later | ID verification provider | Only after validation |

## Principles

- Security in the database (row-level security), not only in the client.
- Public data is coarse: city-level locations only.
- Every user-facing string goes through i18n from the first screen.
- Deal status changes happen in server-side functions, never by direct client writes.
- Mobile-first: design every screen for a phone width first.

## Needed from the founder before the first build

- A Supabase project (free plan, EU region) — its URL and public key.
- A place to host the web app (question 4 in DECISIONS.md).
