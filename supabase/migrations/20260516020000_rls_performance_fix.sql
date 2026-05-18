-- P2.3 — Drop duplicate permissive policies
-- listings_select_own is a strict subset of listings_select_all (deleted_at IS NULL covers everyone)
-- chat_messages_delete_own is a strict subset of chat_messages_delete_in_own_chats
DROP POLICY IF EXISTS listings_select_own ON public.listings;
DROP POLICY IF EXISTS chat_messages_delete_own ON public.chat_messages;

-- P2.2 — Wrap auth.uid() with (select auth.uid()) on all RLS policies
-- Prevents per-row re-evaluation; Supabase evaluates the subselect once per statement instead.

-- chat_messages
DROP POLICY IF EXISTS chat_messages_delete_in_own_chats ON public.chat_messages;
CREATE POLICY chat_messages_delete_in_own_chats ON public.chat_messages
  FOR DELETE TO public
  USING (chat_id IN (
    SELECT chats.id FROM chats
    WHERE chats.buyer_id  = (SELECT auth.uid())
       OR chats.seller_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS chat_messages_insert_participant ON public.chat_messages;
CREATE POLICY chat_messages_insert_participant ON public.chat_messages
  FOR INSERT TO public
  WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = chat_messages.chat_id
        AND (c.seller_id = (SELECT auth.uid()) OR c.buyer_id = (SELECT auth.uid()))
    )
  );

DROP POLICY IF EXISTS chat_messages_select_participant ON public.chat_messages;
CREATE POLICY chat_messages_select_participant ON public.chat_messages
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM chats c
    WHERE c.id = chat_messages.chat_id
      AND (c.seller_id = (SELECT auth.uid()) OR c.buyer_id = (SELECT auth.uid()))
  ));

-- chats
DROP POLICY IF EXISTS chats_delete_participant ON public.chats;
CREATE POLICY chats_delete_participant ON public.chats
  FOR DELETE TO public
  USING (seller_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS chats_insert_participant ON public.chats;
CREATE POLICY chats_insert_participant ON public.chats
  FOR INSERT TO public
  WITH CHECK (seller_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS chats_select_participant ON public.chats;
CREATE POLICY chats_select_participant ON public.chats
  FOR SELECT TO public
  USING (seller_id = (SELECT auth.uid()) OR buyer_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS chats_update_participant ON public.chats;
CREATE POLICY chats_update_participant ON public.chats
  FOR UPDATE TO public
  USING     ((SELECT auth.uid()) = buyer_id OR (SELECT auth.uid()) = seller_id)
  WITH CHECK ((SELECT auth.uid()) = buyer_id OR (SELECT auth.uid()) = seller_id);

-- favorites
DROP POLICY IF EXISTS favorites_delete_own ON public.favorites;
CREATE POLICY favorites_delete_own ON public.favorites
  FOR DELETE TO public
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS favorites_insert_own ON public.favorites;
CREATE POLICY favorites_insert_own ON public.favorites
  FOR INSERT TO public
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS favorites_select_own ON public.favorites;
CREATE POLICY favorites_select_own ON public.favorites
  FOR SELECT TO public
  USING (user_id = (SELECT auth.uid()));

-- listing_audit_log
DROP POLICY IF EXISTS audit_select_listing_owner ON public.listing_audit_log;
CREATE POLICY audit_select_listing_owner ON public.listing_audit_log
  FOR SELECT TO public
  USING (EXISTS (
    SELECT 1 FROM listings l
    WHERE l.id = listing_audit_log.listing_id
      AND l.seller_id = (SELECT auth.uid())
  ));

-- listing_photos
DROP POLICY IF EXISTS listing_photos_delete_owner ON public.listing_photos;
CREATE POLICY listing_photos_delete_owner ON public.listing_photos
  FOR DELETE TO public
  USING (EXISTS (
    SELECT 1 FROM listings l
    WHERE l.id = listing_photos.listing_id
      AND l.seller_id = (SELECT auth.uid())
  ));

DROP POLICY IF EXISTS listing_photos_insert_owner ON public.listing_photos;
CREATE POLICY listing_photos_insert_owner ON public.listing_photos
  FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM listings l
    WHERE l.id = listing_photos.listing_id
      AND l.seller_id = (SELECT auth.uid())
  ));

-- listings
DROP POLICY IF EXISTS listings_delete_own ON public.listings;
CREATE POLICY listings_delete_own ON public.listings
  FOR DELETE TO public
  USING (seller_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS listings_insert_own ON public.listings;
CREATE POLICY listings_insert_own ON public.listings
  FOR INSERT TO public
  WITH CHECK (seller_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS listings_update_own ON public.listings;
CREATE POLICY listings_update_own ON public.listings
  FOR UPDATE TO public
  USING     (seller_id = (SELECT auth.uid()))
  WITH CHECK (seller_id = (SELECT auth.uid()));

-- profiles
DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE TO public
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO public
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO public
  USING     (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- reports
DROP POLICY IF EXISTS admin_select_all_reports ON public.reports;
CREATE POLICY admin_select_all_reports ON public.reports
  FOR SELECT TO public
  USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (SELECT auth.uid())) = 'admin'
  );

DROP POLICY IF EXISTS admin_update_reports ON public.reports;
CREATE POLICY admin_update_reports ON public.reports
  FOR UPDATE TO public
  USING (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (SELECT auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT profiles.role FROM profiles WHERE profiles.id = (SELECT auth.uid())) = 'admin'
  );

DROP POLICY IF EXISTS reports_delete_own ON public.reports;
CREATE POLICY reports_delete_own ON public.reports
  FOR DELETE TO public
  USING (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS reports_insert_own ON public.reports;
CREATE POLICY reports_insert_own ON public.reports
  FOR INSERT TO public
  WITH CHECK (reporter_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS reports_select_own ON public.reports;
CREATE POLICY reports_select_own ON public.reports
  FOR SELECT TO public
  USING (reporter_id = (SELECT auth.uid()));
