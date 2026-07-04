-- =============================================================================
-- SociaMart — Hide deactivated/suspended sellers' products (applied via MCP).
-- Deactivated accounts recover automatically on next sign-in (client-side,
-- see src/pages/auth/AuthCallback.jsx) within the 30-day window.
-- =============================================================================

drop policy if exists products_select on public.products;
create policy products_select on public.products for select using (
  auth.uid() = seller_id
  or public.is_admin(auth.uid())
  or not exists (
    select 1 from public.users u
    where u.id = seller_id and (u.is_deleted or u.is_suspended)
  )
);

-- get_feed_candidates is SECURITY DEFINER (bypasses RLS), so it filters
-- is_deleted alongside is_suspended itself. Redefined with:
--   and u.is_suspended = false
--   and u.is_deleted = false
-- (full body identical to 2026_feed_and_saves.sql otherwise — the live
-- definition is authoritative; see migration `hide_deactivated_sellers`).
