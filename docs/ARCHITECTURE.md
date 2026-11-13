# Architecture (proposal — not yet decided)

Goal: one developer, iOS + Android + web, low cost while free, EU data hosting.

| Layer | Proposal | Why |
|---|---|---|
| App | **React Native with Expo** (TypeScript) | One codebase for iOS, Android and web; large ecosystem; good RTL support |
| Backend | **Supabase** (EU region) | Postgres, auth, realtime chat, storage, row-level security — no server to run at the start |
| Geo | **PostGIS** | Radius search and route queries in the database |
| Maps | **MapLibre** + OpenStreetMap-based tiles | No per-request Google Maps bill |
| Auth | Supabase Auth: email, Google, Apple; SMS OTP for phone verification | Apple login is required on iOS when other social logins are offered |
| Push | Expo Notifications | |
| i18n | i18next, `ar` / `de` / `en`, RTL layouts | |
| Later | ID verification provider; Stripe Connect for escrow payments | Only after validation |

Alternative considered: **Flutter + Firebase** — equally valid for the app; Postgres/PostGIS fits the search and map requirements better than Firestore, and Supabase offers EU hosting and plain SQL.

## Principles

- Security in the database (row-level security), not only in the client.
- Public data is coarse: city-level locations only.
- Every user-facing string goes through i18n from the first screen.
- Deal status changes happen in server-side functions, never by direct client writes.
