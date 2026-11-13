---
name: feature-spec
description: Turn a feature idea for the Take With app into a short written spec. Use when the user proposes a new feature, asks "how should X work", or before implementing any feature that has no spec in docs/features/.
---

# Feature spec

Write a spec for: $ARGUMENTS

1. Read `docs/CONCEPT.md`, `docs/DATA-MODEL.md` and `docs/DECISIONS.md`. Check whether the feature already exists there and which phase it belongs to (MVP / Version 2 / Later).
2. If the idea conflicts with a decided item or a product rule in `CLAUDE.md`, say so first and propose a version that fits.
3. Create `docs/features/<kebab-case-name>.md` with exactly these sections:

   - **Goal** — one or two sentences: which user, which problem.
   - **Phase** — MVP, Version 2 or Later, with a reason.
   - **User flow** — numbered steps, from the user's point of view.
   - **Screens** — what is added or changed.
   - **Data** — new or changed entities and fields (keep `docs/DATA-MODEL.md` vocabulary).
   - **Rules and edge cases** — including what happens when a listing expires, a user is blocked, or a deal is cancelled.
   - **Safety and privacy** — effect on the rules in `docs/TRUST-SAFETY-LEGAL.md`; write "none" only after checking.
   - **Texts** — new user-facing strings in English, marked for translation to Arabic and German.
   - **Not included** — what is deliberately left out.
   - **Open questions**

4. Keep it under about one page. Plain language, short sentences.
5. If the feature changes scope or the data model, update `docs/CONCEPT.md` / `docs/DATA-MODEL.md` too.
6. Add any new open question to `docs/DECISIONS.md`.
