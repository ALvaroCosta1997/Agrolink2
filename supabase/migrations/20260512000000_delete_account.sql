-- Atomic account deletion function. Removes all user-owned rows in dependency
-- order, then deletes the profile. chat_messages cascade from chats automatically.

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM listing_photos
  WHERE listing_id IN (SELECT id FROM listings WHERE seller_id = caller_id);

  DELETE FROM listings WHERE seller_id = caller_id;

  DELETE FROM chats WHERE buyer_id = caller_id OR seller_id = caller_id;

  DELETE FROM favorites WHERE user_id = caller_id;

  -- Reports filed BY the user: delete (user no longer needs them tracked to them)
  DELETE FROM reports WHERE reporter_id = caller_id;

  -- Reports filed AGAINST the user: anonymize (preserves moderation history under GDPR)
  UPDATE reports SET reported_user_id = NULL WHERE reported_user_id = caller_id;

  DELETE FROM profiles WHERE id = caller_id;

  RETURN jsonb_build_object('deleted', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION delete_user_account() FROM anon;
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;
