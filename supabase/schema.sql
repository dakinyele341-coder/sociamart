-- =============================================================================
-- SociaMart — Database Schema
-- Run this in the Supabase SQL Editor (or `supabase db push`).
-- Mobile-first social commerce for the Nigerian market.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensions
-- -----------------------------------------------------------------------------
-- PostGIS powers location/proximity search (geography(Point, 4326)).
create extension if not exists postgis;
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Enums
-- -----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('buyer', 'seller', 'both', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type request_status as enum ('open', 'matched', 'fulfilled', 'cancelled', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type feedback_type as enum ('bug', 'suggestion', 'complaint', 'praise', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type feedback_status as enum ('new', 'reviewing', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_status as enum ('active', 'sold', 'draft', 'archived');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------

-- 2.1 Profiles (1:1 with auth.users)
create table if not exists public.users (
  id                   uuid primary key references auth.users(id) on delete cascade,
  full_name            text,
  first_name           text,
  last_name            text,
  username             text unique,
  business_name        text,                    -- store name for sellers
  phone                text,                    -- stored as +234XXXXXXXXXX
  whatsapp             text,                    -- click-to-chat number
  avatar_url           text,
  bio                  text,
  role                 user_role not null default 'buyer',
  is_verified          boolean not null default false,   -- verified seller/buyer badge
  is_new_seller        boolean not null default true,
  state                text,                    -- e.g. "Oyo State"
  town                 text,                    -- e.g. "Ogbomoso"
  location             geography(Point, 4326),  -- lon/lat
  rating               numeric(3,2) not null default 0,
  rating_count         integer not null default 0,
  onboarding_step      smallint not null default 0,      -- last completed step
  onboarding_completed boolean not null default false,
  terms_accepted_at    timestamptz,                      -- when the user accepted ToS
  terms_version        text default '1.0',
  banner_url           text,                             -- seller storefront banner
  is_deleted           boolean not null default false,   -- soft-delete (30-day recovery)
  deleted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- 2.2 Products
create table if not exists public.products (
  id              uuid primary key default gen_random_uuid(),
  seller_id       uuid not null references public.users(id) on delete cascade,
  title           text not null,
  description     text,
  category        text not null,
  price           numeric(12,2) not null default 0,  -- NGN
  currency        text not null default 'NGN',
  images          text[] not null default '{}',      -- storage paths/urls
  video_url       text,
  status          product_status not null default 'active',  -- 'active' = live, 'draft' = unpublished
  is_negotiable   boolean not null default true,
  is_available    boolean not null default true,             -- "Available for sale" toggle (Buy button)
  state           text,
  town            text,
  location        geography(Point, 4326),
  views           integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists products_seller_idx   on public.products(seller_id);
create index if not exists products_category_idx  on public.products(category);
create index if not exists products_status_idx    on public.products(status);
create index if not exists products_location_idx  on public.products using gist(location);

-- 2.3 Product Requests (buyers broadcasting demand; sellers respond)
create table if not exists public.product_requests (
  id              uuid primary key default gen_random_uuid(),
  buyer_id        uuid not null references public.users(id) on delete cascade,
  seller_id       uuid references public.users(id) on delete set null, -- set when matched
  title           text not null,
  description     text,
  category        text,
  budget_min      numeric(12,2),
  budget_max      numeric(12,2),
  status          request_status not null default 'open',
  state           text,
  town            text,
  location        geography(Point, 4326),
  expires_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists requests_buyer_idx     on public.product_requests(buyer_id);
create index if not exists requests_seller_idx    on public.product_requests(seller_id);
create index if not exists requests_status_idx    on public.product_requests(status);
create index if not exists requests_location_idx  on public.product_requests using gist(location);

-- 2.4 Reviews (seller rating system)
create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  seller_id       uuid not null references public.users(id) on delete cascade,
  reviewer_id     uuid not null references public.users(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  rating          smallint not null check (rating between 1 and 5),
  comment         text,
  created_at      timestamptz not null default now(),
  unique (seller_id, reviewer_id, product_id)
);

create index if not exists reviews_seller_idx on public.reviews(seller_id);

-- 2.5 Feedback (customer suggestions / bug reports)
create table if not exists public.feedback (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.users(id) on delete set null,
  type            feedback_type not null default 'suggestion',
  status          feedback_status not null default 'new',
  subject         text,
  message         text not null,
  contact_email   text,
  created_at      timestamptz not null default now()
);

-- 2.6 Follows (buyer follows seller)
create table if not exists public.follows (
  follower_id     uuid not null references public.users(id) on delete cascade,
  following_id    uuid not null references public.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index if not exists follows_following_idx on public.follows(following_id);

-- 2.7 Analytics events (interaction logs; insert-only)
create table if not exists public.analytics_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.users(id) on delete set null,
  session_id      text,
  event_name      text not null,
  properties      jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists analytics_event_idx on public.analytics_events(event_name);

-- -----------------------------------------------------------------------------
-- 3. Helper functions & triggers
-- -----------------------------------------------------------------------------

-- 3.1 Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_users_updated on public.users;
create trigger trg_users_updated before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_requests_updated on public.product_requests;
create trigger trg_requests_updated before update on public.product_requests
  for each row execute function public.set_updated_at();

-- 3.2 Auto-create a profile row when an auth user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, full_name, avatar_url, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3.3 Recompute a seller's aggregate rating after a review change
create or replace function public.recompute_seller_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid := coalesce(new.seller_id, old.seller_id);
begin
  update public.users u
  set rating = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where seller_id = target), 0),
      rating_count = (select count(*) from public.reviews where seller_id = target)
  where u.id = target;
  return null;
end; $$;

drop trigger if exists trg_reviews_rating on public.reviews;
create trigger trg_reviews_rating
  after insert or update or delete on public.reviews
  for each row execute function public.recompute_seller_rating();

-- 3.4 Admin check helper (avoids RLS recursion)
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = uid and role = 'admin');
$$;

-- 3.5 Proximity search: products near a point, ordered by distance (metres)
create or replace function public.products_nearby(
  lat double precision,
  lon double precision,
  radius_m integer default 25000,
  category_filter text default null
)
returns table (
  id uuid,
  seller_id uuid,
  title text,
  price numeric,
  category text,
  images text[],
  town text,
  state text,
  distance_m double precision
) language sql stable set search_path = public as $$
  select p.id, p.seller_id, p.title, p.price, p.category, p.images, p.town, p.state,
         st_distance(p.location, st_setsrid(st_makepoint(lon, lat), 4326)::geography) as distance_m
  from public.products p
  where p.status = 'active'
    and p.location is not null
    and (category_filter is null or p.category = category_filter)
    and st_dwithin(p.location, st_setsrid(st_makepoint(lon, lat), 4326)::geography, radius_m)
  order by distance_m asc;
$$;

-- 3.6 Safely bump a product's view counter (callable by anyone, bypasses the
--     owner-only update policy on products).
create or replace function public.increment_product_views(product_uuid uuid)
returns void language sql security definer set search_path = public as $$
  update public.products set views = views + 1 where id = product_uuid;
$$;

-- 3.7 Seller dashboard analytics. SECURITY DEFINER so it can read analytics_events
--     (which has no client SELECT policy). Returns a single JSON blob of counters.
create or replace function public.get_seller_analytics(seller_uuid uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'total_views',  coalesce((select sum(views) from public.products where seller_id = seller_uuid), 0),
    'views_7d',     coalesce((select count(*) from public.analytics_events e
                              where e.event_name = 'product_view'
                                and (e.properties->>'seller_id') = seller_uuid::text
                                and e.created_at > now() - interval '7 days'), 0),
    'whatsapp_taps',coalesce((select count(*) from public.analytics_events e
                              where e.event_name = 'whatsapp_tap'
                                and (e.properties->>'seller_id') = seller_uuid::text), 0),
    'top_product',  (select json_build_object('id', id, 'title', title, 'views', views)
                     from public.products where seller_id = seller_uuid order by views desc nulls last limit 1),
    'followers',    (select count(*) from public.follows where following_id = seller_uuid),
    'followers_7d', (select count(*) from public.follows
                     where following_id = seller_uuid and created_at > now() - interval '7 days'),
    'requests',     (select count(*) from public.product_requests where seller_id = seller_uuid)
  );
$$;

grant execute on function public.increment_product_views(uuid) to anon, authenticated;
grant execute on function public.get_seller_analytics(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.users            enable row level security;
alter table public.products         enable row level security;
alter table public.product_requests enable row level security;
alter table public.reviews          enable row level security;
alter table public.feedback         enable row level security;
alter table public.follows          enable row level security;
alter table public.analytics_events enable row level security;

-- 4.1 Profiles: readable by anyone, writable only by owner
drop policy if exists users_select on public.users;
create policy users_select on public.users for select using (true);

drop policy if exists users_insert on public.users;
create policy users_insert on public.users for insert with check (auth.uid() = id);

drop policy if exists users_update on public.users;
create policy users_update on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

-- 4.2 Products: anyone reads, only owner mutates
drop policy if exists products_select on public.products;
-- Public read, but products from deactivated (is_deleted) or suspended sellers
-- are hidden; owners keep seeing their own and admins see everything.
create policy products_select on public.products for select using (
  auth.uid() = seller_id
  or public.is_admin(auth.uid())
  or not exists (
    select 1 from public.users u
    where u.id = seller_id and (u.is_deleted or u.is_suspended)
  )
);

drop policy if exists products_insert on public.products;
create policy products_insert on public.products for insert with check (auth.uid() = seller_id);

drop policy if exists products_update on public.products;
create policy products_update on public.products for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

drop policy if exists products_delete on public.products;
create policy products_delete on public.products for delete using (auth.uid() = seller_id);

-- 4.3 Reviews: anyone reads, authenticated users write their own
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select using (true);

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert with check (auth.uid() = reviewer_id);

drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update using (auth.uid() = reviewer_id) with check (auth.uid() = reviewer_id);

drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete using (auth.uid() = reviewer_id);

-- 4.4 Requests: visible only to the involved buyer and seller (admins too)
drop policy if exists requests_select on public.product_requests;
create policy requests_select on public.product_requests for select using (
  auth.uid() = buyer_id
  or auth.uid() = seller_id
  or (status = 'open' and seller_id is null)   -- open requests are discoverable by sellers
  or public.is_admin(auth.uid())
);

drop policy if exists requests_insert on public.product_requests;
create policy requests_insert on public.product_requests for insert with check (auth.uid() = buyer_id);

drop policy if exists requests_update on public.product_requests;
create policy requests_update on public.product_requests for update using (
  auth.uid() = buyer_id
  or auth.uid() = seller_id
  or (status = 'open' and seller_id is null)   -- a seller may claim an open broadcast
) with check (
  auth.uid() = buyer_id or auth.uid() = seller_id
);

-- 4.5 Feedback: anyone can insert, only admins read
drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback for insert with check (true);

drop policy if exists feedback_select on public.feedback;
create policy feedback_select on public.feedback for select using (public.is_admin(auth.uid()));

-- 4.6 Follows: users manage their own follows; anyone may read (for counts)
drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows for select using (true);

drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists follows_delete on public.follows;
create policy follows_delete on public.follows for delete using (auth.uid() = follower_id);

-- 4.7 Analytics: insert-only, no client read
drop policy if exists analytics_insert on public.analytics_events;
create policy analytics_insert on public.analytics_events for insert with check (true);
-- (no select policy => clients cannot read)

-- 4.8 Harden SECURITY DEFINER trigger functions: keep them off the REST RPC surface.
-- (is_admin stays callable — it is referenced inside RLS policies.)
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.recompute_seller_rating() from anon, authenticated;
revoke execute on function public.set_updated_at() from anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Storage buckets & policies
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('product-videos', 'product-videos', true),
  ('avatars',        'avatars',        true)
on conflict (id) do nothing;

-- Public read for all three buckets
drop policy if exists "Public read media" on storage.objects;
create policy "Public read media" on storage.objects for select
  using (bucket_id in ('product-images', 'product-videos', 'avatars'));

-- Authenticated users can upload into their own folder ({uid}/...)
drop policy if exists "Owner upload media" on storage.objects;
create policy "Owner upload media" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('product-images', 'product-videos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owner update media" on storage.objects;
create policy "Owner update media" on storage.objects for update to authenticated
  using (
    bucket_id in ('product-images', 'product-videos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Owner delete media" on storage.objects;
create policy "Owner delete media" on storage.objects for delete to authenticated
  using (
    bucket_id in ('product-images', 'product-videos', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- 6. Social feed: saves, comments, seller-impression rollup
--    (full definitions incl. the candidate functions + pg_cron schedule live in
--    supabase/migrations/2026_feed_and_saves.sql — run that file once.)
-- -----------------------------------------------------------------------------
create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.saved_items enable row level security;
drop policy if exists saved_items_select on public.saved_items;
create policy saved_items_select on public.saved_items for select using (auth.uid() = user_id);
drop policy if exists saved_items_insert on public.saved_items;
create policy saved_items_insert on public.saved_items for insert with check (auth.uid() = user_id);
drop policy if exists saved_items_delete on public.saved_items;
create policy saved_items_delete on public.saved_items for delete using (auth.uid() = user_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select using (true);
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert with check (auth.uid() = user_id);
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete using (auth.uid() = user_id);

create table if not exists public.seller_impressions_7d (
  seller_id uuid primary key references public.users(id) on delete cascade,
  impression_count integer not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.seller_impressions_7d enable row level security;
drop policy if exists seller_impressions_select on public.seller_impressions_7d;
create policy seller_impressions_select on public.seller_impressions_7d for select using (true);

-- 6b. Reactions (one emoji per user per product). Read only via RPC aggregates.
--     Full RPCs in supabase/migrations/2026_reactions.sql.
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  emoji text not null check (emoji in ('fire','love','money','eyes')),
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.reactions enable row level security;
drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists reactions_update on public.reactions;
create policy reactions_update on public.reactions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists reactions_delete on public.reactions;
create policy reactions_delete on public.reactions for delete to authenticated using (auth.uid() = user_id);

-- 6c. Notifications (rows created by SECURITY DEFINER triggers — see
--     supabase/migrations/2026_profiles_and_notifications.sql for triggers/RPCs).
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select using (auth.uid() = user_id);
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- End of schema
-- =============================================================================
