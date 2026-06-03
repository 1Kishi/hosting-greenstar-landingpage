# GreenStar Hosting

Landing page for a website-hosting service. Built with **Astro + TypeScript + Tailwind CSS v4**, deployed on **Cloudflare Pages**.

## Run locally

```bash
npm install
npm run dev      # http://localhost:4321
```

## Build

```bash
npm run build    # outputs static site to ./dist
npm run preview  # preview the production build
```

## Deploy to Cloudflare Pages

A **static** Astro site (`dist/`) plus **Pages Functions** in `functions/`. The contact
form posts to `/api/contact` → `functions/api/contact.ts`, which stores leads in a
**Cloudflare D1** database.

### Option A — Git integration (recommended)
1. Push this repo to GitHub/GitLab.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deploy. Every push to your main branch redeploys automatically.

### Option B — Direct upload via Wrangler
```bash
npm run build
npx wrangler pages deploy dist --project-name=greenstar
```

## Contact form backend (D1 + Turnstile)

### 1. Database
Already configured in `wrangler.toml`:

| | |
|---|---|
| Binding | `DB` |
| Database name | `greenstar-leads` |
| Database ID | `1c4e9e3c-71be-4523-9651-a721491df660` |

Create the table (run once for local, once for remote):
```bash
npx wrangler d1 execute greenstar-leads --local  --file=./schema.sql
npx wrangler d1 execute greenstar-leads --remote --file=./schema.sql
```

In the Pages project: **Settings → Functions → D1 database bindings** → add binding
`DB` → `greenstar-leads`. (Direct-upload deploys don't read `wrangler.toml` bindings,
so set the binding in the dashboard too.)

### 2. Turnstile (spam protection)
- Site key (already in the form): `0x4AAAAAADeMpLQt3ngSqxXW`
- Add the **secret key** as an environment variable in
  **Settings → Environment variables**: `TURNSTILE_SECRET_KEY`.
  The backend only enforces Turnstile when this variable is set, so local dev works
  without it.

### 3. Read incoming leads
```bash
npx wrangler d1 execute greenstar-leads --remote \
  --command="SELECT id, created_at, name, email, interest, status FROM leads ORDER BY id DESC LIMIT 20;"
```

### 4. E-mail notifications (Resend)
Each submission is stored in D1 **and** e-mailed to you via [Resend](https://resend.com).
Email is fail-soft: if it's not configured or errors, the lead is still saved and the
visitor still sees success.

Setup:
1. Create a free Resend account and **verify your sending domain** (add the DNS records
   Resend shows you — easy since your DNS is on Cloudflare). You can only send from a
   verified domain, not from gmail.com.
2. Create an API key in Resend.
3. In the Pages project **Settings → Environment variables**, add:
   - `RESEND_API_KEY` — your Resend API key (mark as a secret)
   - `MAIL_FROM` — sender on your verified domain, e.g. `GreenStar <poptavka@vasedomena.cz>`
   - `MAIL_TO` — optional; defaults to `jacobworkgreen@gmail.com`

Replies: hitting **Reply** in Gmail goes straight to the visitor (their address is set
as `Reply-To`). Until `RESEND_API_KEY` + `MAIL_FROM` are set, notifications are skipped
and you read leads from D1 (below).

> **Quick test before your domain is verified:** Resend lets you send from
> `onboarding@resend.dev` to the e-mail you signed up with. Set `MAIL_FROM="GreenStar <onboarding@resend.dev>"`
> and `MAIL_TO` to that same address to confirm the flow, then switch to your domain.

### Local dev with functions
`npm run dev` (Astro) does **not** run the Pages Functions. To test `/api/contact`
locally, build and serve through Wrangler:
```bash
npm run build
npx wrangler pages dev dist
```

## Customize

- **Copy / offers / prices:** edit the arrays at the top of `src/components/Offers.astro`, `Pricing.astro`, `Audience.astro`, `Addons.astro`.
- **Colors / fonts:** `src/styles/global.css` (`@theme` block).
- **Contact form fields:** `src/components/Contact.astro` — keep field `name`s in sync with the columns in `schema.sql` and the `INSERT` in `functions/api/contact.ts`.

## Stack
- Astro 5 (static output)
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- TypeScript (strict)
- Fonts: Fraunces (display) + Hanken Grotesk (body)
