-- NOTE: Applied via MCP apply_migration (16-migration history drift, same as Wave 1 hotfix).
--
-- ============================================================
-- Admin role migration — 2026-04-18
-- Replaces the hardcoded-email admin check on the reports table
-- with a proper role column on profiles.
--
-- Changes:
--   1. Add role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin'))
--      to profiles. All existing rows default to 'user'.
--   2. Drop the two email-based admin policies on reports:
--        - admin_select_all_reports
--        - admin_update_reports
--   3. Create two role-based replacements that check
--      (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'.
--
-- ⚠ After applying this migration, run the following SQL in the
--   Supabase dashboard SQL Editor BEFORE testing the admin panel —
--   otherwise every existing profile (including yours) will have
--   role = 'user' and the admin panel will be inaccessible:
--
--     UPDATE public.profiles
--     SET role = 'admin'
--     WHERE email = 'av.pereiradacosta@gmail.com';
--
-- The three reporter-own policies (SELECT own, INSERT own, DELETE own)
-- are not touched by this migration.
-- ============================================================


-- ------------------------------------------------------------
-- 1. Add role column to profiles
--
-- Defaults to 'user' so all existing rows are safe. The CHECK
-- constraint ensures no value other than 'user' or 'admin' can
-- ever be written, even directly in the dashboard.
-- ------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));


-- ------------------------------------------------------------
-- 2. Drop the two email-hardcoded admin policies on reports
--
-- These policies granted admin access by looking up
-- 'av.pereiradacosta@gmail.com' in auth.users on every query —
-- fragile (only one admin possible), hardcoded in SQL, and
-- impossible to change without a new migration. We replace them
-- with role-based equivalents below.
-- ------------------------------------------------------------
DROP POLICY admin_select_all_reports ON public.reports;
DROP POLICY admin_update_reports ON public.reports;


-- ------------------------------------------------------------
-- 3a. New admin SELECT policy on reports
--
-- Admins (role = 'admin' in profiles) can read all reports.
-- The existing reports_select_own policy stays in place, so
-- reporters continue to see their own reports via the OR of
-- the two permissive SELECT policies.
-- ------------------------------------------------------------
CREATE POLICY admin_select_all_reports ON public.reports
  FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );


-- ------------------------------------------------------------
-- 3b. New admin UPDATE policy on reports
--
-- Admins can update any report (to change status, add resolution
-- notes). No other user has an UPDATE policy, so only admins
-- can update. WITH CHECK mirrors USING so the role check applies
-- to the resulting row as well, preventing a privilege-drop
-- trick where an admin writes a row that no longer passes USING.
-- ------------------------------------------------------------
CREATE POLICY admin_update_reports ON public.reports
  FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
