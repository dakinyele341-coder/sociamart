-- =============================================================================
-- SociaMart — Catalog & Buyer Experience migration
-- Run this once in the Supabase SQL Editor (it is also folded into schema.sql).
-- =============================================================================

-- "Available for sale" toggle drives the Buy button on product pages.
alter table public.products
  add column if not exists is_available boolean not null default true;

-- Safely bump a product's view counter (bypasses owner-only update policy).
create or replace function public.increment_product_views(product_uuid uuid)
returns void language sql security definer set search_path = public as $$
  update public.products set views = views + 1 where id = product_uuid;
$$;

-- Seller dashboard analytics (SECURITY DEFINER to read analytics_events).
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
