# Take With

Community app that connects **travellers with spare luggage space** to **people who need something carried** on the same route — e.g. 2 kg free on a flight Bremen → Damascus. Free: carrying is a favour.

**Test version:** https://mo5005.github.io/take-with/ (web app — open it on your phone and use "Add to Home Screen").
App ID for later store apps: `com.dumo.takewith`.

## One-time setup (founder)

The app needs four things switched on. Until step 1 is done, the app shows "The database is not set up yet".

1. **Database** — Supabase dashboard → SQL Editor → New query → paste all of [`supabase/schema.sql`](supabase/schema.sql) → Run.
2. **Login return address** — Supabase → Authentication → URL Configuration:
   - Site URL: `https://mo5005.github.io/take-with/`
   - Redirect URLs: add `https://mo5005.github.io/take-with/`
3. **Google login** — Supabase → Authentication → Sign In / Providers → Google → enable. It asks for a Client ID and a Client Secret. Create them in the Google Cloud Console (APIs & Services → Credentials → Create credentials → OAuth client ID → Web application) with:
   - Authorized JavaScript origin: `https://mo5005.github.io`
   - Authorized redirect URI: `https://qzmhuumnwhnrybzrzkvk.supabase.co/auth/v1/callback`

   Until this is done, use "Send me a login link" (email) on the login screen. It works after steps 1 and 2.
4. **Hosting** — GitHub → repository Settings → Pages → Source: **GitHub Actions**. Then open the Actions tab and re-run "Deploy web app". GitHub Pages on a free account needs a public repository.

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
