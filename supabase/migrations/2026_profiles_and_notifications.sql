-- =============================================================================
-- SociaMart — Profiles (banner/soft-delete), follow notifications, response rate
-- =============================================================================

-- 1. Profile additions
alter table public.users add column if not exists banner_url text;
alter table public.users add column if not exists is_deleted boolean not null default false;
alter table public.users add column if not exists deleted_at timestamptz;

-- 2. Notifications table
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  type        text not null,
  message     text not null,
  is_read     boolean not null default false,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select using (auth.uid() = user_id);
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; when others then null; end $$;

-- 3. Notification triggers (SECURITY DEFINER; execute revoked from clients below)
create or replace function public.tg_notify_new_follower()
returns trigger language plpgsql security definer set search_path = public as $$
declare actor text;
begin
  if new.follower_id = new.following_id then return new; end if;
  select coalesce(business_name, full_name, 'Someone') into actor from public.users where id = new.follower_id;
  insert into public.notifications(user_id, type, message, metadata)
  values (new.following_id, 'new_follower', actor || ' started following your store',
          jsonb_build_object('actor_id', new.follower_id));
  return new;
end; $$;
drop trigger if exists trg_notify_new_follower on public.follows;
create trigger trg_notify_new_follower after insert on public.follows
  for each row execute function public.tg_notify_new_follower();

create or replace function public.tg_notify_new_review()
returns trigger language plpgsql security definer set search_path = public as $$
declare actor text;
begin
  select coalesce(business_name, full_name, 'Someone') into actor from public.users where id = new.reviewer_id;
  insert into public.notifications(user_id, type, message, metadata)
  values (new.seller_id, 'review_received',
          actor || ' left you a ' || repeat('⭐', new.rating) || ' review',
          jsonb_build_object('review_id', new.id, 'product_id', new.product_id, 'rating', new.rating, 'actor_id', new.reviewer_id));
  return new;
end; $$;
drop trigger if exists trg_notify_new_review on public.reviews;
create trigger trg_notify_new_review after insert on public.reviews
  for each row execute function public.tg_notify_new_review();

create or replace function public.tg_notify_new_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare actor text;
begin
  if new.seller_id is null then return new; end if;
  select coalesce(business_name, full_name, 'Someone') into actor from public.users where id = new.buyer_id;
  insert into public.notifications(user_id, type, message, metadata)
  values (new.seller_id, 'request_received', actor || ' requested an item from your store',
          jsonb_build_object('request_id', new.id, 'actor_id', new.buyer_id));
  return new;
end; $$;
drop trigger if exists trg_notify_new_request on public.product_requests;
create trigger trg_notify_new_request after insert on public.product_requests
  for each row execute function public.tg_notify_new_request();

create or replace function public.tg_notify_request_seen()
returns trigger language plpgsql security definer set search_path = public as $$
declare seller_name text;
begin
  -- Fires when a seller claims/responds (open -> matched), notifying the buyer.
  if old.status = 'open' and new.status <> 'open' and new.seller_id is not null then
    select coalesce(business_name, full_name, 'A seller') into seller_name from public.users where id = new.seller_id;
    insert into public.notifications(user_id, type, message, metadata)
    values (new.buyer_id, 'request_seen', 'Your request was seen by ' || seller_name,
            jsonb_build_object('request_id', new.id, 'actor_id', new.seller_id));
  end if;
  return new;
end; $$;
drop trigger if exists trg_notify_request_seen on public.product_requests;
create trigger trg_notify_request_seen after update on public.product_requests
  for each row execute function public.tg_notify_request_seen();

revoke execute on function public.tg_notify_new_follower() from public, anon, authenticated;
revoke execute on function public.tg_notify_new_review() from public, anon, authenticated;
revoke execute on function public.tg_notify_new_request() from public, anon, authenticated;
revoke execute on function public.tg_notify_request_seen() from public, anon, authenticated;

-- 4. Seller response rate
create or replace function public.get_seller_response_rate(seller_uuid uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select case when count(*) = 0 then null
         else round(count(*) filter (where status <> 'open')::numeric / count(*), 2) end
  from public.product_requests where seller_id = seller_uuid;
$$;
grant execute on function public.get_seller_response_rate(uuid) to anon, authenticated;

-- 5. Soft-delete the current account
create or replace function public.deactivate_account()
returns void language sql security definer set search_path = public as $$
  update public.users set is_deleted = true, deleted_at = now() where id = auth.uid();
$$;
grant execute on function public.deactivate_account() to authenticated;
