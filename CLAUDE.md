# Take With

Peer-to-peer app: travellers with free luggage space carry items for people on the same route. Founder is based in Germany. Routes are anywhere → anywhere. App ID: `com.dumo.takewith`.

**Phase: test version built** (web app on GitHub Pages: https://mo5005.github.io/take-with/). The founder tests on a phone, so every screen must work at phone width (390 px).

## Commands

```bash
npm run typecheck    # TypeScript check — run before every commit
npm run build:web    # static web build into dist/ (also what the deploy workflow runs)
npm run web          # local dev server
```

- Expo SDK 58. Expo changes between versions: check `node_modules/expo*/` types or https://docs.expo.dev/versions/v58.0.0/ before using an Expo API from memory.
- Add packages with the versions from `node_modules/expo/bundledNativeModules.json` (`npx expo install` needs network access that cloud sessions may not have).
- `maplibre-gl` is pinned to version 4. Newer versions ship a separate worker file that the Metro bundler does not handle.
- Screens are in `src/app/`, shared code in `src/components/` and `src/lib/`. All database calls go through `src/lib/api.ts`.

## Database

- `supabase/schema.sql` is the full setup. The founder runs it by hand in the Supabase SQL editor; Claude has no database access.
- After the first run, never edit `schema.sql` alone: add a new file `supabase/migrations/<date>_<name>.sql` with only the change, update `schema.sql` to match, and tell the founder to run the migration.
- Test SQL on a local Postgres first (stub the `auth` schema, roles `anon` and `authenticated`, and the `supabase_realtime` publication).

## Read first

- @docs/DECISIONS.md — decisions and open questions (project memory)
- `docs/CONCEPT.md` — features and MVP scope
- `docs/TRUST-SAFETY-LEGAL.md` — safety rules every feature must respect
- `docs/DATA-MODEL.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`

## Vocabulary — use these words consistently

- **Trip**: a traveller's offer of free capacity. **Request**: a sender's need. Both are **listings**.
- **Traveller** carries; **sender** hands over; **receiver** collects at the destination.
- **Deal**: an agreed match between one traveller and one sender.

## Product rules that must never be broken

1. **Open-item rule.** A deal cannot become `handed_over` without the traveller's inspection confirmation. Never design a flow for sealed packages.
2. **No public precise location.** Only city/airport level is public. No home addresses, flight numbers or exact times in listings.
3. **Free only.** Listings have no price. No payment, wallet or escrow features until decided in DECISIONS.md.
4. **Login and accepted safety rules** before posting or messaging (enforced in the database). Test version: Google or email login. SMS phone verification must be added before public launch.
5. **Three languages always**: every user-facing string exists in `ar`, `de`, `en`; layouts must work right-to-left.
6. **Reviews only from completed deals.**
7. **GDPR by default**: collect the minimum, EU hosting, account deletion and export must stay possible.

## How to work in this repo

- The founder is not a native English speaker: write plain, short sentences in docs and replies. Explain technical terms on first use.
- When a decision is made in conversation, record it in `docs/DECISIONS.md` (use the `decision-log` skill).
- New feature ideas get a spec before any code (use the `feature-spec` skill) and a safety check (use the `safety-review` skill).
- Prefer the simplest solution that fits the MVP. Push anything else to "Version 2" or "Later" in `docs/CONCEPT.md` instead of building it.
- Do not present legal statements as facts. Mark them "needs legal check" and add them to the open questions.
- Keep docs in sync: if a change touches the data model or scope, update the matching file in `docs/` in the same commit.

## Skills

- `/feature-spec <idea>` — turn an idea into a spec in `docs/features/`
- `/safety-review <feature or file>` — check against the trust, safety and legal rules
- `/decision-log <decision>` — record a decision or open question
