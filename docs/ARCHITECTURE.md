# Architecture

Goal: built by the founder with Claude, testable on a phone through a web link, native apps later from the same code, low cost while free, EU data hosting.

| Layer | Choice | Why |
|---|---|---|
| App | **Expo** (React Native, TypeScript) with **web output** | One codebase: web app now, iOS and Android later |
| Web delivery | Installable web app (PWA — a website that can be added to the phone's home screen) | Test from any phone with a link, no app store |
| App ID | `com.dumo.takewith` | Used for the iOS bundle ID and Android package later |
| Backend | **Supabase** (EU region) | Database (Postgres), login, live chat, file storage, row-level security — no own server |
| Geo | Test version: latitude/longitude columns and a distance check. **PostGIS** later | Enough for small data; no extension to set up |
| Places | City list bundled in the app (`src/data/cities.json`, built from open GeoNames data by `scripts/build-cities.js`). Airports later | Routes are anywhere → anywhere; no paid geocoding service |
| Maps | **MapLibre GL JS 4** + OpenFreeMap tiles (web only for now) | No per-request Google Maps bill |
| Login | Supabase Auth. Test version: Google and email login link. Later: Apple, SMS code for phone verification | Apple login is required on iOS when other social logins are offered |
| Notifications | Email first; web push and Expo push later | Web push on iPhone only works after "Add to Home Screen" |
| Languages | i18next, `ar` / `de` / `en`, right-to-left layouts | |
| Later | ID verification provider | Only after validation |

## Principles

- Security in the database (row-level security), not only in the client.
- Public data is coarse: city-level locations only.
- Every user-facing string goes through i18n from the first screen.
- Deal status changes happen in server-side functions, never by direct client writes.
- Mobile-first: design every screen for a phone width first.

## Where things are

| Path | Content |
|---|---|
| `src/app/` | Screens (Expo Router: one file = one screen) |
| `src/components/` | Shared UI parts, place picker, map |
| `src/lib/` | Supabase client, data functions (`api.ts`), login state, languages, city search |
| `src/locales/` | Texts in `en`, `de`, `ar` |
| `supabase/schema.sql` | Tables, security rules and server functions |
| `.github/workflows/deploy.yml` | Build and publish to GitHub Pages |

## Database security

- Every table has row-level security. The app only holds the publishable key.
- A deal changes status only through the server function `deal_action`. The database refuses `handed_over` without the traveller's inspection.
- Ratings can only be written for a delivered deal, by the two people in it.
- Users cannot change their own rating or delivery count.
