-- =============================================================================
-- SociaMart — Social feed, saves, comments & proximity candidate functions
-- Run once in the Supabase SQL Editor. Also folded into schema.sql.
-- Requires: postgis (already enabled), pg_cron (enable under Database → Extensions).
-- =============================================================================

-- 1. Saved items -------------------------------------------------------------
create table if not exists public.saved_items (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);
create index if not exists saved_items_user_idx on public.saved_items(user_id);
alter table public.saved_items enable row level security;

drop policy if exists saved_items_select on public.saved_items;
create policy saved_items_select on public.saved_items for select using (auth.uid() = user_id);
drop policy if exists saved_items_insert on public.saved_items;
create policy saved_items_insert on public.saved_items for insert with check (auth.uid() = user_id);
drop policy if exists saved_items_delete on public.saved_items;
create policy saved_items_delete on public.saved_items for delete using (auth.uid() = user_id);

-- 2. Comments ----------------------------------------------------------------
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  content     text not null check (length(trim(content)) > 0),
  created_at  timestamptz not null default now()
);
create index if not exists comments_product_idx on public.comments(product_id);
alter table public.comments enable row level security;

drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select using (true);
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert with check (auth.uid() = user_id);
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete using (auth.uid() = user_id);

-- 3. Seller impressions 7-day rollup ----------------------------------------
create table if not exists public.seller_impressions_7d (
  seller_id        uuid primary key references public.users(id) on delete cascade,
  impression_count integer not null default 0,
  updated_at       timestamptz not null default now()
);
-- Readable by anyone (used for the fair-reach boost); no client writes.
alter table public.seller_impressions_7d enable row level security;
drop policy if exists seller_impressions_select on public.seller_impressions_7d;
create policy seller_impressions_select on public.seller_impressions_7d for select using (true);

create or replace function public.refresh_seller_impressions_7d()
returns void language plpgsql security definer set search_path = public as $$
begin
  truncate table public.seller_impressions_7d;
  insert into public.seller_impressions_7d (seller_id, impression_count, updated_at)
  select (properties->>'seller_id')::uuid, count(*), now()
  from public.analytics_events
  where event_name = 'impression'
    and created_at > now() - interval '7 days'
    and (properties->>'seller_id') is not null
  group by 1;
end; $$;

-- Schedule hourly refresh via pg_cron (enable the extension first).
create extension if not exists pg_cron;
do $$ begin
  perform cron.unschedule('refresh-seller-impressions-7d-hourly');
exception when others then null; end $$;
select cron.schedule(
  'refresh-seller-impressions-7d-hourly',
  '0 * * * *',
  $$ select public.refresh_seller_impressions_7d() $$
);

-- 4. Feed candidate functions ------------------------------------------------
-- Returns active products in the last 30 days within `radius_m` of the user,
-- pre-joined with 7-day engagement stats, seller metadata and the viewer's
-- follow/save relationship. The Edge Function scores & orders these.
create or replace function public.get_feed_candidates(
  current_user_id uuid,
  user_lat double precision,
  user_lng double precision,
  radius_m integer default 100000
)
returns table (
  id uuid,
  seller_id uuid,
  title text,
  description text,
  price numeric,
  category text,
  images text[],
  video_url text,
  is_available boolean,
  town text,
  state text,
  views integer,
  created_at timestamptz,
  distance_km double precision,
  seller_name text,
  seller_avatar text,
  seller_verified boolean,
  seller_whatsapp text,
  views_7d integer,
  saves_7d integer,
  whatsapp_taps_7d integer,
  impressions_7d integer,
  comments_count integer,
  seller_impressions_7d integer,
  is_following boolean,
  is_saved boolean
) language sql stable security definer set search_path = public as $$
  with pt as (
    select case when user_lat is null or user_lng is null then null
                else st_setsrid(st_makepoint(user_lng, user_lat), 4326)::geography end as g
  )
  select
    p.id, p.seller_id, p.title, p.description, p.price, p.category, p.images, p.video_url,
    p.is_available, p.town, p.state, p.views, p.created_at,
    case when (select g from pt) is null or p.location is null then null
         else st_distance(p.location, (select g from pt)) / 1000.0 end as distance_km,
    u.business_name, u.avatar_url, u.is_verified, coalesce(u.whatsapp, u.phone),
    coalesce((select count(*) from analytics_events e where e.event_name='product_view'
              and (e.properties->>'product_id')=p.id::text and e.created_at > now()-interval '7 days'),0)::int,
    coalesce((select count(*) from saved_items s where s.product_id=p.id and s.created_at > now()-interval '7 days'),0)::int,
    coalesce((select count(*) from analytics_events e where e.event_name='whatsapp_tap'
              and (e.properties->>'product_id')=p.id::text and e.created_at > now()-interval '7 days'),0)::int,
    coalesce((select count(*) from analytics_events e where e.event_name='impression'
              and (e.properties->>'product_id')=p.id::text and e.created_at > now()-interval '7 days'),0)::int,
    coalesce((select count(*) from comments c where c.product_id=p.id),0)::int,
    coalesce((select impression_count from seller_impressions_7d si where si.seller_id=p.seller_id),0)::int,
    exists(select 1 from follows f where f.follower_id=current_user_id and f.following_id=p.seller_id),
    exists(select 1 from saved_items s where s.user_id=current_user_id and s.product_id=p.id)
  from products p
  join users u on u.id = p.seller_id
  where p.status='active'
    and p.created_at > now() - interval '30 days'
    and (
      (select g from pt) is null
      or p.location is null
      or st_dwithin(p.location, (select g from pt), radius_m)
    );
$$;

grant execute on function public.get_feed_candidates(uuid, double precision, double precision, integer) to anon, authenticated;
grant execute on function public.refresh_seller_impressions_7d() to service_role;
