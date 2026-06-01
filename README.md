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

This is a fully **static** Astro site, so no adapter is needed.

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
npx wrangler pages deploy dist --project-name=hostflow
```

## Customize

- **Copy / offers:** edit the arrays at the top of `src/components/Offers.astro`, `Audience.astro`, `Addons.astro`.
- **Colors / fonts:** `src/styles/global.css` (`@theme` block).
- **Contact form:** currently inert. Wire it to a Cloudflare Pages Function, a form service (Formspree, Web3Forms), or an email endpoint — see `src/components/Contact.astro`.

## Stack
- Astro 5 (static output)
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- TypeScript (strict)
- Fonts: Fraunces (display) + Hanken Grotesk (body)
