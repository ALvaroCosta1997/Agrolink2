-- ============================================================
-- Contact Governance
-- 2026-04-03
-- ============================================================
-- These columns mirror the contactVisibility object that lives
-- in the KV-store profile blob, so that any authenticated user
-- can read another seller's visibility settings via a simple
-- Postgres query (the KV store is private / service-role only).
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_contacts    BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_schedule TEXT    DEFAULT 'always',   -- 'always' | 'schedule'
  ADD COLUMN IF NOT EXISTS contact_from     TIME    DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS contact_until    TIME    DEFAULT '19:00';
