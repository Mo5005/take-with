---
name: safety-review
description: Review a Take With feature, spec, screen or code change against the app's trust, safety, privacy and legal rules. Use before a feature spec is accepted, before merging anything that touches listings, chat, deals, profiles, location or personal data, or when the user asks "is this safe" or "is this allowed".
---

# Safety review

Review: $ARGUMENTS (if empty, review the current uncommitted changes).

Read `docs/TRUST-SAFETY-LEGAL.md` and the product rules in `CLAUDE.md`, then check each point. Answer every point with **OK**, **Problem** or **Not affected**, with one line of reason.

1. **Open-item rule** — can any path reach `handed_over` without inspection confirmation? Does anything suggest sealed packages are acceptable?
2. **Prohibited items** — does the feature make it easier to offer or hide a prohibited item? Is the list shown where the user needs it?
3. **Location privacy** — is anything more precise than city/airport public? Are flight numbers, addresses or exact times exposed outside private chat?
4. **Contact privacy** — are phone numbers or emails exposed without the user choosing it?
5. **Verification gates** — is phone verification still required before posting and messaging?
6. **Reputation integrity** — can ratings be created without a completed deal, or by the same person on both sides?
7. **Abuse** — spam, fake listings, harassment in chat: is report and block reachable from every new surface?
8. **Money** — does it introduce prices, payments, stored balances or fees? (Not allowed: the app is free only.)
9. **Personal data (GDPR)** — which new data is collected, why, how long is it kept, is it deleted with the account, does it leave the EU?
10. **Access control** — can a user read or change another user's listings, chats or deals? Is this enforced on the server, not only in the app?
11. **Wording** — does any text promise safety, insurance, legality or guaranteed delivery that the platform cannot guarantee?
12. **Languages** — are all new strings present in `ar`, `de`, `en` and does the layout work right-to-left?

Finish with:

- **Verdict**: Ready / Ready after fixes / Not ready
- **Must fix** — concrete changes
- **Needs legal check** — anything a lawyer should confirm; add these to the open questions in `docs/DECISIONS.md`

Do not state what the law says as fact. Describe the risk and mark it for legal check.
