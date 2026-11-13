# Decisions and Open Questions

Project memory. Claude reads this file every session (imported from CLAUDE.md).
Add an entry whenever something is decided or a question is answered — newest first.

## Decided

| Date | Decision | Why |
|---|---|---|
| 2026-11-13 | App is **free** at launch; no in-app payments in the MVP | Validate demand first; avoid payment regulation |
| 2026-11-13 | Two listing kinds: **trip** and **request** | A one-sided board leaves senders with nothing to do when no trip matches |
| 2026-11-13 | **Open-item rule**: traveller must inspect and confirm every item | Traveller is legally responsible for what they carry |
| 2026-11-13 | Public location data is **city/airport level only** | Privacy and personal safety |
| 2026-11-13 | Launch on **one corridor** first (proposal: Germany ↔ Syria) | Marketplace density beats coverage |
| 2026-11-13 | Languages from day one: Arabic (RTL), German, English | Target community |

## Proposed (needs the founder's confirmation)

- Working name **TakeWith**.
- Tech stack: Expo (React Native) + Supabase + PostGIS + MapLibre — see ARCHITECTURE.md.
- Users must be 18+.

## Open questions

1. Launch corridor: only Germany ↔ Syria, or neighbouring hubs (Beirut, Amman, Istanbul, Erbil) too?
2. Mobile app first, or web app first for faster validation?
3. Who builds it — founder alone, with Claude, a team?
4. Is a legal entity planned (e.g. UG) before launch? Needed for imprint, terms and liability.
5. Electronics: allowed, restricted or forbidden at launch?
6. Should paid offers be allowed at launch at all, or free-only for the first months (simpler legally)?
7. Current sanctions/export-control position for the launch corridor — needs legal check.
