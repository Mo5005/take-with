# Take With

Community app that connects **travellers with spare luggage space** to **people who need something carried** on the same route — e.g. 2 kg free on a flight Bremen → Damascus. Users may carry for free or ask for a price; the app takes no fee and handles no money.

**Test version:** https://mo5005.github.io/take-with/ (web app — open it on your phone and use "Add to Home Screen").
App ID for later store apps: `com.dumo.takewith`.

## One-time setup (founder)

The app needs four things switched on. Until step 1 is done, the app shows "The database is not set up yet".

1. **Database** — Supabase dashboard → SQL Editor → New query → paste all of [`supabase/schema.sql`](supabase/schema.sql) → Run.
   If you created the database earlier, run the newer files in [`supabase/migrations/`](supabase/migrations/) once each, oldest first:
   - `2026-11-15_listing_price.sql` (prices)
   - `2026-11-16_local_delivery.sql` (local delivery, couriers, admin, photo storage)
     On a phone, use the 5 short files in `supabase/migrations/2026-11-16_local_delivery_parts/` instead (part1 to part5, in order). Long files can get cut off when you copy them on a phone.
2. **Login return address** — Supabase → Authentication → URL Configuration:
   - Site URL: `https://mo5005.github.io/take-with/`
   - Redirect URLs: add `https://mo5005.github.io/take-with/`
3. **Google login** — Supabase → Authentication → Sign In / Providers → Google → enable. It asks for a Client ID and a Client Secret. Create them in the Google Cloud Console (APIs & Services → Credentials → Create credentials → OAuth client ID → Web application) with:
   - Authorized JavaScript origin: `https://mo5005.github.io`
   - Authorized redirect URI: `https://qzmhuumnwhnrybzrzkvk.supabase.co/auth/v1/callback`

   Until this is done, use "Send me a login link" (email) on the login screen. It works after steps 1 and 2.
4. **Make yourself admin** — after you logged in once, run this in the SQL Editor with your login email:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'YOUR-EMAIL';
   ```

   Then Profile → Admin appears in the app.
5. **Test data (optional)** — to fill the app with 8 test users, 50 trips and requests and 10 local delivery jobs (2 test users are approved couriers), run [`supabase/seed-mock.sql`](supabase/seed-mock.sql) in the SQL Editor. Remove them later with [`supabase/remove-mock.sql`](supabase/remove-mock.sql).
6. **Hosting** — GitHub → repository Settings → Pages → Source: **GitHub Actions**. Then open the Actions tab and re-run "Deploy web app". GitHub Pages on a free account needs a public repository.

## Develop

```bash
npm install
npm run web          # local dev server
npm run typecheck
npm run build:web    # static build in dist/
```

Stack: Expo (React Native + web), Supabase, MapLibre. Languages: Arabic, German, English.

## Documents

| Document | What it covers |
|---|---|
| [docs/CONCEPT.md](docs/CONCEPT.md) | Vision, users, features, scope |
| [docs/TRUST-SAFETY-LEGAL.md](docs/TRUST-SAFETY-LEGAL.md) | Trust, prohibited items, liability, GDPR |
| [docs/DATA-MODEL.md](docs/DATA-MODEL.md) | Entities, states, filters |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Tech stack, folders, database security |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decision log and open questions (project memory) |
| [CLAUDE.md](CLAUDE.md) | Instructions for Claude Code in this repo |
