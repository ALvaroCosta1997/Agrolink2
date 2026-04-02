-- ============================================================
-- Messaging Governance
-- 2026-04-02
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Soft-delete column on listings
-- ────────────────────────────────────────────────────────────
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Partial index — only covers actually-deleted rows
CREATE INDEX IF NOT EXISTS idx_listings_deleted_at
  ON listings (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- ────────────────────────────────────────────────────────────
-- 2. Update SELECT RLS on listings
--    Public → active rows only (deleted_at IS NULL)
--    Owner  → all own rows including soft-deleted
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "listings_select_all" ON listings;
CREATE POLICY "listings_select_all" ON listings
  FOR SELECT USING (deleted_at IS NULL);

DROP POLICY IF EXISTS "listings_select_own" ON listings;
CREATE POLICY "listings_select_own" ON listings
  FOR SELECT USING (seller_id = auth.uid());

-- ────────────────────────────────────────────────────────────
-- 3. RLS audit: chat/message policies already correct
--    chat_messages_select_participant  ✓
--    chat_messages_insert_participant  ✓
--    chats_select_participant          ✓
-- No new policies needed.
-- ────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────
-- 4. Governance helper functions (called by pg_cron)
-- ────────────────────────────────────────────────────────────

-- Job 1: purge messages + chats for listings deleted >10 days ago
CREATE OR REPLACE FUNCTION cleanup_deleted_listing_chats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Messages first (FK child of chats)
  DELETE FROM chat_messages
  WHERE chat_id IN (
    SELECT c.id
    FROM chats c
    JOIN listings l ON l.id = c.listing_id
    WHERE l.deleted_at IS NOT NULL
      AND l.deleted_at < NOW() - INTERVAL '10 days'
  );

  -- Then the chat rows
  DELETE FROM chats
  WHERE listing_id IN (
    SELECT id FROM listings
    WHERE deleted_at IS NOT NULL
      AND deleted_at < NOW() - INTERVAL '10 days'
  );
END;
$$;

-- Job 2: purge messages + chats inactive for >10 days (active listings only)
CREATE OR REPLACE FUNCTION cleanup_inactive_chats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Messages first (FK child of chats)
  DELETE FROM chat_messages
  WHERE chat_id IN (
    SELECT c.id
    FROM chats c
    JOIN listings l ON l.id = c.listing_id
    WHERE l.deleted_at IS NULL
      AND c.last_update < NOW() - INTERVAL '10 days'
  );

  -- Then the stale chat rows
  DELETE FROM chats
  USING listings
  WHERE listings.id = chats.listing_id
    AND listings.deleted_at IS NULL
    AND chats.last_update < NOW() - INTERVAL '10 days';
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 5. Enable pg_cron and schedule nightly jobs at 02:00 UTC
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Idempotent unschedule (silent if job doesn't exist yet)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-deleted-listing-chats');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-inactive-chats');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-deleted-listing-chats',
  '0 2 * * *',
  'SELECT cleanup_deleted_listing_chats()'
);

SELECT cron.schedule(
  'cleanup-inactive-chats',
  '0 2 * * *',
  'SELECT cleanup_inactive_chats()'
);
