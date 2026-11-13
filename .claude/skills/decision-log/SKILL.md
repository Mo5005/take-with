---
name: decision-log
description: Record a product or technical decision, or an open question, in docs/DECISIONS.md. Use whenever the user decides something about Take With ("let's go with…", "we will not…", "I decided…"), answers an open question, or raises a question that cannot be answered now.
---

# Decision log

Record: $ARGUMENTS

1. Open `docs/DECISIONS.md`.
2. Decide what this is:
   - **Decision** → add a row at the top of the "Decided" table: today's date, the decision in one sentence, the reason in one sentence.
   - **Answer to an open question** → add it to "Decided" and remove the question from "Open questions" (renumber the list).
   - **Confirmation of a proposal** → move it from "Proposed" to "Decided".
   - **New question** → append to "Open questions".
3. If the new decision replaces an older one, do not delete the old row: append "(replaced on <date>)" to it.
4. Check whether other files now disagree — `CLAUDE.md`, `docs/CONCEPT.md`, `docs/DATA-MODEL.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` — and update them in the same change.
5. Tell the user in one or two sentences what was recorded and which files changed.

Only record what the user actually decided. If it is unclear whether something was a decision or just a thought, ask.
