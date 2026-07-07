# Uniblex Game & Content Platform

Uniblex is a Next.js, Tailwind CSS, and Supabase platform for WebGL browser games, original game development articles, SEO pages, AdSense-ready ad zones, and an admin CMS.

## Core Stack

- Next.js 14 app router
- Tailwind CSS brand system
- Supabase Auth and PostgreSQL
- Supabase RLS policies for admin-only writes
- Google Analytics 4 via `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- Dynamic sitemap, robots.txt, Open Graph metadata, and JSON-LD schema

## Local Setup

```bash
pnpm install
pnpm dev
```

Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SITE_URL=https://www.uniblex.com
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
NEXT_PUBLIC_BING_SITE_VERIFICATION=
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
CLOUDINARY_CLOUD_NAME=dktp3tqgl
CLOUDINARY_UPLOAD_PRESET=uniblex_uploads
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Supabase Setup

1. Create a Supabase project.
2. Run all SQL files in `supabase/migrations` in order.
3. Create the owner user in Supabase Auth.
4. Insert that Auth user ID into the `admins` table with `role = 'owner'` and `is_active = true`.
5. Add Supabase URL and anon key to Vercel environment variables.

### Required Auth URL Settings

In Supabase Auth URL Configuration, set:

- Site URL: `https://www.uniblex.com`
- Redirect URL: `https://www.uniblex.com/**`
- Redirect URL: `https://uniblex.com/**`
- Redirect URL: `https://www.uniblex.com/admin/reset-password`

Password recovery emails from `/admin/login` redirect to `/admin/reset-password`, where the admin sets a new password before returning to `/admin/login`.

## Admin CMS

The `/admin` route supports:

- Games
- Blog posts
- Categories
- Ad zones
- SEO settings
- Contact submissions
- Admin access records

Public users cannot register in phase 1. Only authenticated Supabase users with active `owner` or `admin` records in the `admins` table can access and manage content.

Game records support either external hosted iframe URLs or WebGL ZIP uploads from the admin panel. Use `iframe_url` for Cloudflare R2-hosted builds such as `https://...r2.dev/game/index.html`; no ZIP is required in that mode. ZIP files remain supported when selected, must contain an `index.html`, extract in the admin browser, upload directly to the public Supabase Storage bucket `webgl-games`, and automatically save the public Storage URL for `{slug}/index.html` as the iframe URL. Cover image uploads are sent through the authenticated admin upload API to Cloudinary with the configured cloud name and unsigned upload preset, while manual `iframe_url` and `cover_url` fields remain available as fallbacks.

## Launch Checklist

- Configure domain `uniblex.com` in Vercel.
- Add GA4 measurement ID.
- Add Search Console verification through DNS or the `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` meta tag.
- Add Bing Webmaster verification through the optional `NEXT_PUBLIC_BING_SITE_VERIFICATION` meta tag.
- Publish at least 15 to 20 original pages before AdSense submission.
- Replace example game iframe URLs with hosted WebGL builds.
- Keep each game build compressed and ideally under 100MB.
- Confirm mobile layout, sitemap, robots.txt, legal pages, and contact form.
- Enable ad zones only after the AdSense account is ready.

## Brand

- Heading font: Orbitron
- Body font: Exo 2
- Primary blue: `#00B2FF`
- Primary purple: `#7A3CFF`
- Accent pink: `#FF4DDB`
- Dark background: `#0D1118`

Tagline: Create, Play, Inspire.
