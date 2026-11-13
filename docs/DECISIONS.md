# Decisions and Open Questions

Project memory. Claude reads this file every session (imported from CLAUDE.md).
Add an entry whenever something is decided or a question is answered — newest first.

## Decided

| Date | Decision | Why |
|---|---|---|
| 2026-11-13 | Test version login: **Google** (plus email login link as a fallback). No SMS phone check yet | Founder's decision; SMS costs money. SMS verification comes before public launch |
| 2026-11-13 | Hosting: **GitHub Pages**, https://mo5005.github.io/take-with/ | Founder's decision; free |
| 2026-11-13 | Cities come from a **list inside the app** (about 8,800 cities: over 50,000 people, plus capitals). Search area uses simple distance maths, not PostGIS yet | No setup needed for the test version; PostGIS can come when there is much data |
| 2026-11-13 | **Free only** at launch: listings have no price field | Founder's decision; also simpler legally than paid carrying |
| 2026-11-13 | Routes are **anywhere → anywhere**, no corridor limit | Founder's decision |
| 2026-11-13 | **Web app first** (installable, mobile-first), native apps later from the same code | Founder tests on a phone; a web link needs no app store |
| 2026-11-13 | Tech stack: **Expo (React Native + web) + Supabase + PostGIS + MapLibre** | One codebase for web now and iOS/Android later; see ARCHITECTURE.md |
| 2026-11-13 | Built by the **founder with Claude** | Founder's decision |
| 2026-11-13 | Name **Take With**; app ID `com.dumo.takewith` | Founder's decision ("for now") |
| 2026-11-13 | App is **free** at launch; no in-app payments in the MVP | Validate demand first; avoid payment regulation |
| 2026-11-13 | Two listing kinds: **trip** and **request** | A one-sided board leaves senders with nothing to do when no trip matches |
| 2026-11-13 | **Open-item rule**: traveller must inspect and confirm every item | Traveller is legally responsible for what they carry |
| 2026-11-13 | Public location data is **city/airport level only** | Privacy and personal safety |
| 2026-11-13 | Launch on **one corridor** first (proposal: Germany ↔ Syria) (replaced on 2026-11-13 by "anywhere → anywhere") | Marketplace density beats coverage |
| 2026-11-13 | Languages from day one: Arabic (RTL), German, English | Target community |

## Proposed (needs the founder's confirmation)

- Users must be 18+.
- Marketing still starts with one community (Germany ↔ Syria), even though the app accepts every route. An app open to the world is empty everywhere unless one community fills it first.

## Not in the test version yet

Photos (listing and chat), notifications, unread badges, airports in the place list, delivery code for the receiver, export of own data, imprint and privacy policy, moderation screen (reports are read in the Supabase dashboard).

## Open questions

1. Is a legal entity planned (e.g. UG) before public launch? Needed for imprint, terms and liability.
2. Electronics: allowed, restricted or forbidden at launch?
3. Sanctions, export-control and customs rules differ per country. With open routes we cannot keep a list per destination. Is a general forbidden list plus "check the rules of your destination" enough? — needs legal check.
4. Own domain for the public launch?
5. Arabic and German city names exist only for about 80 large cities. Where do we get the rest?
