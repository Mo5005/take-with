# Take With

Peer-to-peer app: travellers with free luggage space carry items for people on the same route. Founder is based in Germany. Routes are anywhere → anywhere. App ID: `com.dumo.takewith`.

**Phase: concept is final; the build has not started.** Build the web app first (Expo with web output + Supabase, see `docs/ARCHITECTURE.md`). The founder tests on a phone, so every screen must work at phone width.

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
4. **Phone verification** before posting or messaging.
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
