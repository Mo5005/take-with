# Trust, Safety and Legal

This is the part that decides whether the app survives. Listing and chat features are easy; **making strangers trust each other with a suitcase is the product.**

> Nothing here is legal advice. Before public launch a lawyer (German platform law, customs, data protection) must review terms, the prohibited-items list and the liability model. Tracked in DECISIONS.md.

## 1. The core problem

At every airport travellers are asked: *"Did you pack your bag yourself? Are you carrying anything for someone else?"* A traveller who carries an item is **personally responsible** for it at security and customs — in the departure country, in transit and at arrival. "Someone gave it to me through an app" is no defence.

So the app must never encourage blind carrying. The rule that shapes the whole product:

**The traveller sees, checks and understands everything they carry. No sealed packages. Ever.**

## 2. Safety rules built into the product

| Rule | How the app enforces it |
|---|---|
| **Open-item rule** | Sender must describe the item and add a photo. At handover the traveller ticks "I inspected the item myself and it matches the description" before the deal can move to *handed over*. |
| **Right to refuse** | Traveller can cancel at handover without penalty or rating impact, reason "item not as described". |
| **Prohibited items** | Shown during onboarding, when creating a listing, and in chat when risky keywords appear. |
| **Verified phone** | Required for posting and messaging. |
| **Ratings only after real deals** | Prevents fake reputation. |
| **Report & block** | On every profile, listing and chat. Reports are reviewed by a human. |
| **Public handover advice** | Meet in a public place; airport handover on arrival where possible. |
| **Privacy by default** | Only city/airport is public — never home address, flight number or exact time. Those are shared in chat by choice. |

## 3. Prohibited and restricted items (first draft)

**Never allowed**

- Drugs and any controlled substances
- Weapons, ammunition, weapon parts, explosives, fireworks
- Cash, gold, jewellery and other valuables carried for others (customs declaration and money-laundering rules; cash of €10,000+ must be declared when leaving or entering the EU)
- Prescription medicine for another person without prescription and documentation
- Tobacco and alcohol above personal allowance
- Counterfeit goods
- Anything forbidden in air travel (lithium batteries loose in checked bags, flammables, aerosols beyond limits …)
- Sealed or wrapped packages the traveller cannot open
- Items under export control or sanctions for the destination country

**Allowed with care**

- Documents (traveller may see what kind of document, not necessarily read it — to be defined)
- Clothes, gifts, toys, books
- Phones/laptops: high risk (value, customs duties, export rules) — likely "restricted", max one device, with receipt
- Over-the-counter medicine in original packaging
- Packaged, non-perishable food, where the destination allows it

The list must be maintained **per corridor**, because import rules differ per destination country.

## 4. Legal topics to resolve

1. **Platform role.** We connect users; we are not a carrier, courier or party to the agreement. Terms must say so clearly, and the product must behave that way.
2. **Customs & import rules** for each destination — duties, allowances, forbidden goods.
3. **Sanctions and export control.** Rules for Syria have been changing; check the current EU/German position before launch and again regularly. Do not assume.
4. **Paid carrying.** A traveller who regularly carries for money may be acting commercially (tax, trade registration, airline conditions of carriage). Cost-sharing framing ("contribution to ticket cost") is safer than "earnings" — needs legal confirmation.
5. **Airline conditions.** Many airlines forbid carrying items for third parties. Users must be told honestly.
6. **GDPR.** We are based in Germany: privacy policy, legal basis for each data use, data minimisation, deletion and export of account data, EU hosting, processor agreements. ID documents (if we add verification) should stay with the verification provider — we store only the result.
7. **EU Digital Services Act.** Reporting channel for illegal content, statement of reasons on moderation, contact point, transparent terms. Lighter duties for small platforms but not zero.
8. **Imprint (Impressum)** and consumer-law basics for a German operator.
9. **Minors.** 18+ only.

## 5. Trust levels

| Level | Requirement | Unlocks |
|---|---|---|
| 0 Guest | none | Browse listings |
| 1 Member | email + verified phone | Post, message |
| 2 Verified | ID check (v2) | Badge, higher ranking, paid deals later |
| 3 Trusted | 3+ completed deals, rating ≥ 4.5, no upheld reports | "Trusted" badge |

## 6. Moderation

- MVP: manual. Report queue reviewed by the founder; target response within 24 h.
- Keyword flags in listings (not in private chat content beyond what the user reports) for prohibited items.
- Actions: warn, remove listing, suspend, ban (by phone number and device).
- Keep an audit log of moderation decisions.
