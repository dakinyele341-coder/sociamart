# SociaMart

**Discover. Connect. Buy.** — a mobile-first social commerce web app for the Nigerian market.

SociaMart connects local buyers and sellers by proximity. Buyers browse a location-aware
feed, discover sellers nearby, and reach out directly over **WhatsApp**. Sellers list items
(or respond to buyer *requests*) and build trust through verification badges and reviews.

---

## Tech stack

| Layer        | Choice                                  |
| ------------ | --------------------------------------- |
| Build / UI   | Vite + React 18                         |
| Styling      | Tailwind CSS 3 (design tokens via CSS vars) |
| Routing      | React Router 6                          |
| Backend      | Supabase (Postgres + PostGIS, Auth, Storage, RLS) |
| Analytics    | PostHog (`posthog-js`)                  |
| Fonts        | Plus Jakarta Sans (display) + Inter (body) |

The app is designed **mobile-first**: a centered `max-w-md` column, a sticky top `Header`,
and a floating, thumb-friendly `BottomNav`.

---

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
#   then fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (and optionally PostHog)

# 3. Run the dev server
npm run dev

# 4. Production build
npm run build && npm run preview
```

> The app runs **without** a backend: when Supabase env vars are missing, the data hooks
> serve demo listings and forms fall back to a "demo captured" toast. This makes the UI
> reviewable before any infrastructure is connected.

---

## Database setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql). It:
   - enables the **PostGIS** extension (required for `geography(Point, 4326)` proximity search);
   - creates enums, tables (`users`, `products`, `product_requests`, `reviews`, `feedback`, `follows`, `analytics_events`);
   - installs triggers (auto-create profile on signup, `updated_at`, seller-rating rollups);
   - defines the `products_nearby(lat, lon, radius_m, category)` RPC used by the feed;
   - enables **Row Level Security** with per-table policies;
   - creates public storage buckets `product-images`, `product-videos`, `avatars` with owner-scoped write policies.

### PostGIS note
PostGIS ships with Supabase but may need enabling. The schema runs
`create extension if not exists postgis;` for you; if your project restricts extensions,
enable **PostGIS** under *Database → Extensions* first.

### Storage buckets
The schema creates the three buckets and policies. Uploads must be placed in a
`{user_id}/...` path prefix so the owner-write policy applies, e.g.
`product-images/<uid>/<file>.jpg`.

---

## Authentication & onboarding

SociaMart signs users in with **Google OAuth** (primary) or an **email magic link**
(fallback) — [`src/pages/auth/AuthPage.jsx`](src/pages/auth/AuthPage.jsx). The client uses
the **PKCE** flow; both methods redirect to
[`/auth/callback`](src/pages/auth/AuthCallback.jsx), which exchanges the code for a session,
records terms acceptance, and routes the user onward. After signing in, users pass through the
[`OnboardingFlow`](src/pages/onboarding/OnboardingFlow.jsx):

1. **Name** — first + last name
2. **Location** — GPS detect or pick a Nigerian town
3. **Role** — buyer (finishes here) / seller / both
4. **Business details** — store name, bio, WhatsApp, avatar (sellers only)
5. **First product** — optional first listing, then a confetti "Your store is live!" celebration

Progress is saved to `public.users` after every step (`onboarding_step`,
`onboarding_completed`), so a user who drops off resumes at their last step on next sign-in.
Route guards live in [`src/App.jsx`](src/App.jsx): `/onboarding` requires auth and forwards
already-onboarded users to the feed.

### Legal consent & pages

The auth screen shows inline agreement text linking to **Terms of Service** (`/terms`) and
**Privacy Policy** (`/privacy`). The typed email is persisted to `sessionStorage`, so opening
a legal page and coming back keeps it. On first sign-in, `AuthCallback` records
`terms_accepted_at` and `terms_version` (`1.0`) on the user's profile.

The legal pages are markdown-driven: content lives in
[`src/content/terms.md`](src/content/terms.md) and
[`src/content/privacy.md`](src/content/privacy.md) (imported with Vite's `?raw`) and is
rendered via `react-markdown` through a shared
[`LegalLayout`](src/pages/legal/LegalLayout.jsx) styled to the design system. Both pages are
public and also linked from a **Legal** section in Account. The `.md` files are starter
templates — have them reviewed by counsel before launch.

### Supabase Auth config you must enable

The live project (`SociaMart`, ref `cfxfydizebskncxafxry`) is already wired into `.env`.
Set the following in the dashboards (Google OAuth can't be scripted — it needs credentials
you generate):

1. **Google Cloud Console** → create an OAuth **web** client ID. Add the authorized redirect
   URI: `https://cfxfydizebskncxafxry.supabase.co/auth/v1/callback`.
2. **Supabase → Authentication → Providers → Google** → enable it and paste the client ID +
   secret.
3. **Supabase → Authentication → URL Configuration** → add redirect URLs
   `http://localhost:5173/auth/callback` (and your production `…/auth/callback`).

The **email magic link** works without extra setup once the redirect URLs above are added.

> ⚠️ Browser geolocation needs **HTTPS** in production (`localhost` is exempt in dev).

## RLS policy summary

| Table              | Read                                   | Write                              |
| ------------------ | -------------------------------------- | ---------------------------------- |
| `users`            | anyone                                 | owner only                         |
| `products`         | anyone                                 | owner (`seller_id`)                |
| `reviews`          | anyone                                 | authenticated (own `reviewer_id`)  |
| `product_requests` | involved buyer/seller, open requests, admin | buyer (insert), buyer/seller (update) |
| `feedback`         | admins only                            | anyone (insert)                    |
| `follows`          | anyone (for counts)                    | owner (`follower_id`)              |
| `analytics_events` | none                                   | anyone (insert-only)               |

---

## Project structure

```
public/logo/            Brand SVGs (light, dark, icon) + preview.html
scripts/svg-to-png.mjs  Optional SVG→PNG export (needs `sharp`)
supabase/schema.sql     Full database schema + RLS + storage
src/
  components/
    ui/                 Button, Input, Card, Badge, Avatar, Toast, Skeleton, Modal, Sheet, Pill
    layout/             Header, BottomNav, AppLayout, LocationSheet, SearchSheet
    ProductCard.jsx     Feed/grid product tile
    FeedbackModal.jsx
    icons.jsx
  context/              AuthContext, LocationContext, ToastContext
  hooks/                useProducts, useNearbyProducts, useFeed
  lib/                  supabase, posthog, whatsapp, format, validation, categories, cn
  pages/                FeedPage, ExplorePage, SellPage, AccountPage, NotFoundPage
```

---

## Design system

Tokens live as CSS variables in [`src/index.css`](src/index.css) and are mapped into
Tailwind in [`tailwind.config.js`](tailwind.config.js).

- **Primary** `#FF5722` · **Primary dark** `#E64A19` · **Navy** `#1A1A2E`
- **Success** `#22C55E` · **Error** `#EF4444` · **Verified** `#3B82F6`
- Signature **tactile lift**: `.tactile-card` raises and shadows on hover/tap;
  `.tactile-press` gives buttons a subtle press-scale.
- Dark mode via the `.dark` class (tokens swap automatically).

---

## Logos

SVGs are in `public/logo/`. Preview them at `public/logo/preview.html`.
To generate PNG variants, install `sharp` and run the export script:

```bash
npm i -D sharp
node scripts/svg-to-png.mjs
```

---

## Location & geocoding

`LocationContext` ships with a **mock geocoder** mapping major Nigerian towns to
coordinates, plus browser-GPS detection that reverse-maps to the nearest known town.
Swap `geocodePlace` for a real provider (OpenStreetMap/Nominatim or Mapbox) when ready —
the rest of the app consumes `{ lat, lon, town, state }` unchanged.

---

## Verification

- `npm run build` — verifies Vite + Tailwind compile cleanly.
- Form validation: invalid emails and malformed Nigerian phone numbers are rejected
  (`src/lib/validation.js`).
- Manual: open in a mobile viewport, confirm the bottom nav floats and taps are
  thumb-friendly, card taps trigger the tactile lift, and toasts fire on actions.

---

## Developer notes

### Run locally
```bash
npm install
cp .env.example .env   # fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (+ optional PostHog)
npm run dev            # http://localhost:5173
npm run build          # production build (the gate — there is no test runner)
```

### Set up a Supabase project from scratch
1. Create a project at [supabase.com](https://supabase.com).
2. **Database → Extensions → enable `postgis`** (proximity) and **`pg_cron`** (impression rollup).
3. SQL Editor → run, in order: `supabase/schema.sql`, then the deltas in `supabase/migrations/`
   (`2026_catalog.sql`, `2026_feed_and_saves.sql`, `2026_reactions.sql`,
   `2026_profiles_and_notifications.sql`, `2026_trust_and_security.sql`). `schema.sql` already
   runs `create extension if not exists postgis;`.
4. **Edge function**: `supabase functions deploy get_feed` (source in `supabase/functions/get_feed`).
5. **Auth**: enable Google (Authentication → Providers → Google, with a Google Cloud OAuth web
   client; redirect URI `https://<ref>.supabase.co/auth/v1/callback`) and add
   `http://localhost:5173/auth/callback` under Authentication → URL Configuration. Email magic
   link needs no extra setup.
6. Copy the project URL + anon/publishable key into `.env`.

### Create the admin user
Admin is **server-enforced** via `is_admin()` in RLS (reads `users.role`). Promote your account:
```sql
update public.users u set role = 'admin'
from auth.users a where a.id = u.id and a.email = 'dakinyele341@gmail.com';
```
The `/admin` panel checks `role === 'admin'` (or the email) client-side and redirects others to `/`;
every admin write is also gated by `is_admin()` in RLS. For a hardened JWT `is_admin` custom claim,
add a Supabase **custom access token hook** that injects `role` — optional, since RLS already
enforces it.

### Deploy to Vercel
1. Import the repo; framework preset **Vite** (build `npm run build`, output `dist`).
2. Set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_POSTHOG_KEY`,
   `VITE_POSTHOG_HOST`.
3. Add a SPA rewrite so client routes work — `vercel.json`:
   `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`.
4. In Supabase Auth → URL Configuration, add your production `https://<domain>/auth/callback`.

### Conventions
- **Folders**: `src/lib` (pure helpers + Supabase calls, all guarded by `isSupabaseConfigured`),
  `src/hooks` (data hooks), `src/context` (providers + `useX()`), `src/components/ui` (primitives),
  `src/components` (composite), `src/pages` (routes; admin under `src/pages/admin`).
- **Naming**: PascalCase components/files, camelCase utils, kebab in URLs. Reference code as
  `path:line`.
- **Add a page**: create `src/pages/Foo.jsx`, register a `<Route>` in `src/App.jsx` (inside
  `AppLayout` for app-chrome pages, or top-level for full-screen ones; wrap in `<RequireAuth>` to
  gate). Use existing `ui/` primitives and design tokens.
- **Add an analytics event**: `import { track } from '../lib/posthog'` and call
  `track('event_name', { ...props })` at the action site. For events that must feed server
  aggregates (impressions, views), also `logEvent(...)` from `src/lib/analytics.js`
  (writes to `analytics_events`). Keep names snake_case and consistent with the list on the
  admin Analytics page.

## Roadmap (next)

- Product detail page + image upload to Storage
- Seller profiles, follow system, and reviews UI
- Real geocoding provider and map view
- Admin dashboard for feedback triage (`useAdmin`)
