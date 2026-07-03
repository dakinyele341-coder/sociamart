-- =============================================================================
-- SociaMart — Reactions + social-proof RPC
-- =============================================================================

create table if not exists public.reactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  emoji       text not null check (emoji in ('fire','love','money','eyes')),
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)          -- one reaction per user per product
);

alter table public.reactions enable row level security;

drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists reactions_update on public.reactions;
create policy reactions_update on public.reactions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists reactions_delete on public.reactions;
create policy reactions_delete on public.reactions
  for delete to authenticated using (auth.uid() = user_id);
-- No SELECT policy: clients read aggregates via the RPCs below only.

create or replace function public.get_reaction_counts(product_uuid uuid)
returns table (emoji text, count bigint)
language sql stable security definer set search_path = public as $$
  select emoji, count(*) as count
  from public.reactions
  where product_id = product_uuid
  group by emoji;
$$;
grant execute on function public.get_reaction_counts(uuid) to anon, authenticated;

create or replace function public.get_my_reaction(product_uuid uuid)
returns text language sql stable security definer set search_path = public as $$
  select emoji from public.reactions
  where product_id = product_uuid and user_id = auth.uid()
  limit 1;
$$;
grant execute on function public.get_my_reaction(uuid) to authenticated;

-- Social proof: 24h view count (clients can't SELECT analytics_events directly).
create or replace function public.get_product_views_24h(product_uuid uuid)
returns bigint language sql stable security definer set search_path = public as $$
  select count(*)
  from public.analytics_events
  where event_name = 'product_view'
    and (properties->>'product_id') = product_uuid::text
    and created_at >= now() - interval '24 hours';
$$;
grant execute on function public.get_product_views_24h(uuid) to anon, authenticated;
