# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SociaMart is a mobile-first social commerce web app for the Nigerian market: buyers browse a
location-aware feed, discover nearby sellers, and contact them directly over WhatsApp. Vite +
React 18, Tailwind 3, React Router 6, Supabase (Postgres + PostGIS, Auth, Storage, RLS), PostHog.

## Commands

```bash
npm install              # install deps
npm run dev              # Vite dev server on host:5173
npm run build            # production build (the main "does it compile" check)
npm run preview          # serve the production build
node scripts/svg-to-png.mjs   # export logo PNGs (requires `npm i -D sharp` first)
```

- There is **no test runner** and **no real linter**: `npm run lint` calls `eslint .` but ESLint
  is not installed and there is no config, so it fails. Treat `npm run build` as the gate.
- Env: copy `.env.example` to `.env`. Vite only exposes vars prefixed `VITE_`.

## Runs without a backend (important architectural rule)

The app is designed to render fully before any Supabase project exists. Preserve this:

- `src/lib/supabase.js` exports `isSupabaseConfigured` (true only when both `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_ANON_KEY` are set). When unset, `supabase` is a **stub client** whose query
  builder is thenable and resolves to `{ data: null, error }`, and whose `auth`/`storage`/`rpc`
  no-op. Importing it never throws.
- Data hooks branch on `isSupabaseConfigured`: when false they serve `DEMO_PRODUCTS` (defined in
  `src/hooks/useProducts.js`). Forms fall back to a "demo captured" toast instead of writing.
- `src/lib/posthog.js` only initializes when `VITE_POSTHOG_KEY` is present; `track`/`identify`/
  `resetAnalytics` are no-ops until then.

When adding any feature that talks to Supabase, follow this pattern: guard real calls behind
`isSupabaseConfigured` and provide a demo/no-op path so the UI stays reviewable.

## Architecture

- **Providers** (`src/main.jsx`): `ToastProvider` → `AuthProvider` → `LocationProvider` wrap the
  router. Each context exposes a `useX()` hook that throws if used outside its provider.
- **Routing** (`src/App.jsx`): two route groups. Full-screen flows with no app chrome —
  `/auth`, `/onboarding` (guarded), plus public `/terms` and `/privacy` — and the main app shell,
  where Feed `/`, Explore `/explore`, Sell `/sell`, Account `/account`, and `*` NotFound nest
  under `AppLayout` (Header + BottomNav + centered `max-w-md` column). `RequireAuth` redirects
  signed-out users to `/auth`; `OnboardingGate` forwards already-onboarded users off `/onboarding`.
  Both render a `FullScreenSpinner` while `loading`, which self-escapes to `/` after 6s so a
  never-loading profile can't hang the UI. Pageviews are tracked manually on route change (PostHog
  autocapture is on but `capture_pageview` is off).
- **Data layer** (`src/hooks/`): `useProducts` (filtered list, falls back to demo) and the
  `products_nearby` PostGIS RPC via `useNearbyProducts`.
- **Feed** (`src/hooks/useFeed.js`, `src/components/FeedPostCard.jsx`, `src/pages/FeedPage.jsx`):
  `useFeed({ mode, filters })` powers "For You"/"Following" tabs with infinite scroll. It tries
  the **`get_feed` edge function** (`supabase/functions/get_feed/index.ts` — weighted scoring +
  exploration interleaving + diversity caps over `get_feed_candidates`), and on any failure sets
  a module flag and **falls back to client-side ranking** (recency + proximity + follow boost),
  paginating 10/page. So the feed renders even before the function is deployed. Filters live in
  the URL (`FilterSheet`). Cards log an `impression` event (feeds the `seller_impressions_7d`
  rollup) and carry save/follow/comment actions (`src/lib/saves.js`, `social.js`, `comments.js`,
  `share.js`). The feed DB objects live in `supabase/migrations/2026_feed_and_saves.sql`.
- **Location** (`src/context/LocationContext.jsx`): ships a **mock geocoder** (`NG_PLACES` table
  of Nigerian towns → coordinates) plus browser-GPS detection that reverse-maps to the nearest
  known town. Persists to `localStorage` under `sociamart.location`. Everything downstream
  consumes `{ lat, lon, town, state }`, so swapping in a real geocoder means replacing
  `geocodePlace`/`nearestPlace` only.
- **WhatsApp** (`src/lib/whatsapp.js`): the core "contact seller" mechanism. `normalizeNgNumber`
  coerces Nigerian numbers to `234XXXXXXXXXX` (no `+`); `buildWhatsAppLink` returns a `wa.me`
  URL or `null` for invalid numbers; `productEnquiryMessage` builds the pre-filled buyer message.

## Auth & onboarding

- **Auth is Google OAuth + email magic link** (`src/context/AuthContext.jsx`,
  `src/pages/auth/AuthPage.jsx`). The client uses **PKCE** (`flowType: 'pkce'`,
  `detectSessionInUrl: false` in `src/lib/supabase.js`): both `signInWithGoogle` (OAuth) and
  `requestEmailOtp` (magic link) redirect to **`/auth/callback`**, where `AuthCallback`
  (`src/pages/auth/AuthCallback.jsx`) calls `exchangeCodeForSession(code)`, runs `acceptTerms`,
  then routes by onboarding state (→ `/` if complete, else `/onboarding`). On any auth change,
  `AuthProvider` loads the row from the **`users`** table (not "profiles") into `profile` and
  `identify()`s the user in PostHog. The context exposes `isAuthenticated`, `isAdmin`,
  `onboardingComplete`, `onboardingStep`, `signInWithGoogle`, `requestEmailOtp`, `acceptTerms`
  (writes `terms_accepted_at`/`terms_version` once; `TERMS_VERSION` lives here), `updateProfile`,
  and `refreshProfile(userId?)` (pass the id to avoid the post-callback state race). There is no
  phone/SMS/OTP-code path anymore.
- **Onboarding wizard** (`src/pages/onboarding/`): a step machine — Name → Location → Role, then
  **buyers finish at Role** while **sellers continue** to Business → FirstProduct. Each step
  persists a patch plus `onboarding_step` via `updateProfile`, so progress resumes; `finish` sets
  `onboarding_completed`. `isValidNgPhone`/`formatNgPhoneDisplay` and friends live in
  `src/lib/validation.js`. Demo mode (no Supabase) still renders the flow — `updateProfile` no-ops
  gracefully.
- **Legal consent & pages** (`src/pages/legal/`, `src/content/`): `/terms` and `/privacy` render
  markdown copy from `src/content/{terms,privacy}.md` (imported with Vite's `?raw`) through a
  shared `LegalLayout` + `react-markdown` — edit the `.md` files to change legal text, not JSX.
  `AuthPage` shows inline agreement text (no checkbox) and persists the typed email to
  `sessionStorage` (`sociamart.authDraft`), so opening a legal page mid-signup doesn't wipe it.
  Terms are accepted automatically in `AuthCallback` via `acceptTerms` on first sign-in.

## Product catalog & buyer flows

- **Posting** (`src/pages/sell/`): sellers reach two wizards from the BottomNav "+" (shown only
  for roles seller/both/admin, opens a Sheet). `SingleProductFlow` is a 4-step wizard
  (media → details → location → review) that compresses images client-side
  (`src/lib/media.js` → `browser-image-compression`), uploads via `uploadImage`, and uses a
  CDN-loaded Leaflet pin (`src/components/ui/LeafletMap.jsx`). It doubles as the **edit** form
  when navigated to with `state.product` (then it `updateProduct`s instead of `createProduct`).
  `BulkImportFlow` turns up to 20 photos into products, publishing each independently with a
  "Retry Failed" path. Drafts are `status='draft'`; live is `status='active'`.
- **Mutations** live in `src/lib/products.js` (`createProduct`/`updateProduct`/`deleteProduct`/
  `incrementViews`), follows in `src/lib/social.js`, and event logging in `src/lib/analytics.js`
  (`logEvent` writes to `analytics_events`). All guard `isSupabaseConfigured`.
- **Buyer pages** (full-screen, public, outside `AppLayout`): `/product/:id`
  (`ProductDetailPage` — gallery/video, seller row + follow, distance pill via `geocodePlace` +
  haversine, reviews, related) and `/seller/:id`. `BuyWhatsAppModal` renders a shareable card to
  PNG with **lazy-loaded** `html2canvas` and logs a `whatsapp_tap` event; `RequestItemSheet`
  inserts into `product_requests`. `/store` (under `AppLayout`, guarded) manages live/draft
  products with an optimistic availability `Toggle`. Seller stats on `/account` come from the
  `get_seller_analytics` RPC via `useSellerAnalytics`.
- **Realtime**: `AppLayout` subscribes to `product_requests` inserts and toasts sellers for
  requests addressed to them or open broadcasts.

## Trust & safety

- **Reports/blocks/verification** live in `supabase/migrations/2026_trust_and_security.sql`.
  A `⋯` `KebabMenu` (`src/components/ui/KebabMenu.jsx`) on product cards, the product detail
  page, and seller profiles opens `ReportSheet` (`src/lib/reports.js` → `submit_report` RPC,
  24h dedupe). Blocking a seller (`src/context/BlockContext.jsx`, `src/lib/blocks.js`) filters
  them out of the feed (server-side in `get_feed_candidates`, plus a client belt in `useFeed`
  and `ExplorePage`); manage at `/settings/blocked`. Sellers apply for the verified badge at
  `/verify` (`src/lib/verification.js`); an admin flipping `verification_requests.status` to
  `approved` sets `is_verified` and notifies via the `tg_verification_decided` trigger.
- **Server-enforced limits**: BEFORE-INSERT triggers cap products (10/day), reviews (5/day),
  and requests (20/day) and block suspended sellers — they `raise` a `rate_limit_*` /
  `account_suspended` error that `src/lib/errors.js` maps to friendly copy and logs as a
  `rate_limit_hit` analytics event. Reviews are **one per user per seller**, editable for 24h,
  deletable only by admins. Uploads get random-UUID filenames + MIME/size validation
  (`src/lib/storage.js`, `src/lib/validation.js`). The owner email is `role='admin'`; admin is
  enforced server-side through `is_admin()` in RLS, not just client checks.

## Database & RLS

`supabase/schema.sql` is the single source of truth — run it in the Supabase SQL Editor. It
enables PostGIS (required for `geography(Point,4326)` proximity), and creates:

- **Enums**: `user_role` (buyer/seller/both/admin), `product_status`, `request_status`,
  `feedback_type`, `feedback_status`.
- **Tables**: `users` (one row per auth user), `products`, `product_requests`, `reviews`,
  `feedback`, `follows`, `analytics_events`.
- **Triggers/functions**: `handle_new_user` (auto-inserts a `users` row from `auth.users` metadata
  on signup), `set_updated_at`, `recompute_seller_rating` (rating rollups on review change),
  `is_admin(uid)`, and the `products_nearby(lat, lon, radius_m, category)` RPC.
- **RLS**: public read on most tables; writes scoped to `auth.uid()` (e.g. a product's `seller_id`).
  `feedback` insert is open but select is admin-only; `analytics_events` insert is open.
- **Storage**: public buckets `product-images`, `product-videos`, `avatars`. Uploads **must** use a
  `{user_id}/...` path prefix (see `src/lib/storage.js`) or the owner-write policy rejects them.

If you change table shape, RLS, the RPC signature, or buckets, update `schema.sql` to match.

## Styling / design system

Design tokens are CSS variables in `src/index.css`, mapped into Tailwind in `tailwind.config.js`.
Dark mode is class-based (`.dark`, tokens swap automatically). Signature interactions:
`.tactile-card` (hover/tap lift) and `.tactile-press` (button press-scale). Primary `#FF5722`.
