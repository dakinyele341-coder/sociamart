-- =============================================================================
-- SociaMart — Trust & Security: reports, blocks, verification, review rules,
-- rate limits, suspension, feed filtering. Applied to the live project via MCP.
-- =============================================================================

-- Enums
do $$ begin create type report_reason as enum ('scam','fake_item','inappropriate_content','harassment','spam','other'); exception when duplicate_object then null; end $$;
do $$ begin create type report_status as enum ('pending','reviewed','action_taken','dismissed'); exception when duplicate_object then null; end $$;
do $$ begin create type verification_status as enum ('pending','approved','denied'); exception when duplicate_object then null; end $$;
do $$ begin create type business_type as enum ('individual','registered'); exception when duplicate_object then null; end $$;

alter table public.users add column if not exists is_suspended boolean not null default false;

-- Reports --------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.users(id) on delete cascade,
  reported_user_id uuid references public.users(id) on delete cascade,
  reported_product_id uuid references public.products(id) on delete cascade,
  reason report_reason not null,
  details text,
  status report_status not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports(status, created_at desc);
alter table public.reports enable row level security;
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated with check (auth.uid() = reporter_id);
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select using (auth.uid() = reporter_id or public.is_admin(auth.uid()));
drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Blocks ---------------------------------------------------------------------
create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists blocks_select on public.blocks;
create policy blocks_select on public.blocks for select using (auth.uid() = blocker_id);
drop policy if exists blocks_insert on public.blocks;
create policy blocks_insert on public.blocks for insert to authenticated with check (auth.uid() = blocker_id);
drop policy if exists blocks_delete on public.blocks;
create policy blocks_delete on public.blocks for delete using (auth.uid() = blocker_id);

-- Verification requests ------------------------------------------------------
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  business_name text not null,
  business_type business_type not null default 'individual',
  state text, lga text, whatsapp text, cac_number text,
  status verification_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table public.verification_requests enable row level security;
drop policy if exists verification_select on public.verification_requests;
create policy verification_select on public.verification_requests for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
drop policy if exists verification_insert on public.verification_requests;
create policy verification_insert on public.verification_requests for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists verification_update on public.verification_requests;
create policy verification_update on public.verification_requests for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Reviews: one per user per seller; 24h edit window; admin-only delete --------
do $$
declare c text;
begin
  select conname into c from pg_constraint
   where conrelid = 'public.reviews'::regclass and contype = 'u'
     and conkey @> (select array_agg(attnum) from pg_attribute where attrelid='public.reviews'::regclass and attname in ('seller_id','reviewer_id','product_id'))
   limit 1;
  if c is not null then execute format('alter table public.reviews drop constraint %I', c); end if;
exception when others then null; end $$;
do $$ begin
  alter table public.reviews add constraint reviews_one_per_seller unique (seller_id, reviewer_id);
exception when others then null; end $$;

drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update
  using (auth.uid() = reviewer_id and created_at > now() - interval '24 hours')
  with check (auth.uid() = reviewer_id);
drop policy if exists reviews_delete on public.reviews;
create policy reviews_delete on public.reviews for delete using (public.is_admin(auth.uid()));

-- Rate-limit + suspension triggers (execute revoked from clients) ------------
create or replace function public.enforce_product_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  if exists (select 1 from public.users where id = new.seller_id and is_suspended) then
    raise exception 'account_suspended' using errcode = 'P0001';
  end if;
  select count(*) into cnt from public.products where seller_id = new.seller_id and created_at > now() - interval '1 day';
  if cnt >= 10 then raise exception 'rate_limit_products' using errcode = 'P0001'; end if;
  return new;
end; $$;
drop trigger if exists trg_product_limits on public.products;
create trigger trg_product_limits before insert on public.products for each row execute function public.enforce_product_limits();

create or replace function public.enforce_review_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  select count(*) into cnt from public.reviews where reviewer_id = new.reviewer_id and created_at > now() - interval '1 day';
  if cnt >= 5 then raise exception 'rate_limit_reviews' using errcode = 'P0001'; end if;
  return new;
end; $$;
drop trigger if exists trg_review_limits on public.reviews;
create trigger trg_review_limits before insert on public.reviews for each row execute function public.enforce_review_limits();

create or replace function public.enforce_request_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  select count(*) into cnt from public.product_requests where buyer_id = new.buyer_id and created_at > now() - interval '1 day';
  if cnt >= 20 then raise exception 'rate_limit_requests' using errcode = 'P0001'; end if;
  return new;
end; $$;
drop trigger if exists trg_request_limits on public.product_requests;
create trigger trg_request_limits before insert on public.product_requests for each row execute function public.enforce_request_limits();

revoke execute on function public.enforce_product_limits() from public, anon, authenticated;
revoke execute on function public.enforce_review_limits() from public, anon, authenticated;
revoke execute on function public.enforce_request_limits() from public, anon, authenticated;

-- submit_report RPC with 24h dedupe ------------------------------------------
create or replace function public.submit_report(
  p_reported_user_id uuid, p_reported_product_id uuid, p_reason report_reason, p_details text
) returns text language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  if exists (
    select 1 from public.reports
    where reporter_id = uid
      and reported_user_id is not distinct from p_reported_user_id
      and reported_product_id is not distinct from p_reported_product_id
      and created_at > now() - interval '24 hours'
  ) then return 'duplicate'; end if;
  insert into public.reports (reporter_id, reported_user_id, reported_product_id, reason, details)
  values (uid, p_reported_user_id, p_reported_product_id, p_reason, nullif(trim(p_details), ''));
  return 'ok';
end; $$;
grant execute on function public.submit_report(uuid, uuid, report_reason, text) to authenticated;

-- Verification decision: flip is_verified + notify ---------------------------
create or replace function public.tg_verification_decided()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then return new; end if;
  if new.status = 'approved' then
    update public.users set is_verified = true where id = new.user_id;
    insert into public.notifications(user_id, type, message, metadata)
    values (new.user_id, 'verification_approved', 'Your store is now verified ✓', jsonb_build_object('request_id', new.id));
    new.decided_at := now();
  elsif new.status = 'denied' then
    insert into public.notifications(user_id, type, message, metadata)
    values (new.user_id, 'verification_denied', 'Your verification request was not approved.', jsonb_build_object('request_id', new.id));
    new.decided_at := now();
  end if;
  return new;
end; $$;
drop trigger if exists trg_verification_decided on public.verification_requests;
create trigger trg_verification_decided before update on public.verification_requests for each row execute function public.tg_verification_decided();
revoke execute on function public.tg_verification_decided() from public, anon, authenticated;

-- Admin pattern detection: sellers with 3+ reports in 7 days -----------------
create or replace view public.flagged_sellers as
  select reported_user_id as seller_id, count(*) as report_count, max(created_at) as last_reported
  from public.reports
  where reported_user_id is not null and created_at > now() - interval '7 days'
  group by reported_user_id having count(*) >= 3;

-- NOTE: get_feed_candidates is also updated to exclude suspended sellers and
-- sellers blocked by the viewer (see the body in this same migration set), and
-- the owner account (dakinyele341@gmail.com) is promoted to role='admin'.
