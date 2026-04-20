-- NOTE: Applied via MCP apply_migration because local migration history was out of sync
-- with remote (16 dashboard-applied migrations not in repo). Resolve drift separately
-- before next CLI push.
--
-- ============================================================
-- Emergency hotfix — 2026-04-18
-- Four changes, in order:
--   1. Add missing UPDATE policy on chats
--   2. Fix notify_new_chat_message to read secret from app_config
--   3. Overwrite compromised internal_secret in app_config
--   4. Disable cleanup_orphaned_auth_users cron job (job id 1)
-- ============================================================


-- ------------------------------------------------------------
-- 1. UPDATE policy on chats
--
-- Without this policy, Postgres RLS blocks every UPDATE on the
-- chats table. The app updates a chat on every message send:
-- it writes the message preview, flips the unread flag, and
-- refreshes last_update. All of those writes have been silently
-- denied since the table was created — the policy was simply
-- never added alongside the SELECT/INSERT/DELETE ones.
--
-- This policy allows either participant in a chat (buyer or
-- seller) to update only chats they belong to.
-- ------------------------------------------------------------
CREATE POLICY chats_update_participant ON public.chats
  FOR UPDATE
  TO authenticated
  USING  (auth.uid() = buyer_id OR auth.uid() = seller_id)
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);


-- ------------------------------------------------------------
-- 2. Fix notify_new_chat_message trigger function
--
-- The previous version had the internal secret hard-coded as a
-- string literal ('agrowlink-internal-2026'). That string is
-- now public in the git history and in the Supabase dashboard.
--
-- This version reads the secret at call time from app_config
-- (key = 'internal_secret'). If the row is missing, NULL, or
-- still set to the placeholder 'PENDING_ROTATION', the function
-- logs a warning and returns NEW without making the HTTP call —
-- so a missing or unconfigured secret never prevents a message
-- from being saved. Email notifications will simply be paused
-- until the real rotated secret is written to app_config.
--
-- After applying this migration:
--   1. Go to Supabase dashboard → Table Editor → app_config
--   2. Find the row where key = 'internal_secret'
--   3. Set value to your new rotated secret string
--   4. Set the same value as INTERNAL_SECRET in the Edge
--      Function environment variables
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_new_chat_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
DECLARE
  receiver_id    uuid;
  receiver_email text;
  receiver_name  text;
  sender_name    text;
  listing_species text;
  chat_record    record;
  edge_url       text := 'https://odznjlpzknczzutgirvk.supabase.co/functions/v1/notify-new-message';
  secret         text;
  payload        jsonb;
BEGIN
  -- Read the internal secret from app_config at call time.
  -- Never fall back to a hardcoded string.
  SELECT value INTO secret
  FROM public.app_config
  WHERE key = 'internal_secret';

  -- If the secret is missing or is still the placeholder,
  -- skip the HTTP call entirely rather than send with a
  -- known-bad or missing secret.
  IF secret IS NULL OR secret = 'PENDING_ROTATION' THEN
    RAISE LOG 'notify_new_chat_message: internal_secret not configured — skipping email notification for chat_message %', NEW.id;
    RETURN NEW;
  END IF;

  -- Look up who sent the message and who should receive it.
  SELECT buyer_id, seller_id, listing_id
  INTO chat_record
  FROM public.chats
  WHERE id = NEW.chat_id;

  IF NEW.sender_id = chat_record.buyer_id THEN
    receiver_id := chat_record.seller_id;
  ELSE
    receiver_id := chat_record.buyer_id;
  END IF;

  SELECT email, name INTO receiver_email, receiver_name
  FROM public.profiles
  WHERE id = receiver_id;

  SELECT name INTO sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  SELECT species INTO listing_species
  FROM public.listings
  WHERE id = chat_record.listing_id;

  payload := jsonb_build_object(
    'receiver_email',   receiver_email,
    'receiver_name',    receiver_name,
    'sender_name',      sender_name,
    'listing_species',  listing_species,
    'message_preview',  left(NEW.text, 100)
  );

  PERFORM net.http_post(
    edge_url,
    payload,
    '{}'::jsonb,
    jsonb_build_object(
      'Content-Type',      'application/json',
      'x-internal-secret', secret
    ),
    5000
  );

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_new_chat_message error: %', SQLERRM;
  RETURN NEW;
END;
$function$;


-- ------------------------------------------------------------
-- 3. Overwrite the compromised internal_secret in app_config
--
-- The app_config row for 'internal_secret' already exists and
-- currently holds 'agrowlink-internal-2026' — the string that
-- was public in the git repo and is now also public on GitHub.
-- We must overwrite it immediately so the trigger function
-- above stops sending the known-compromised string.
--
-- 'PENDING_ROTATION' is a deliberately invalid sentinel: the
-- trigger guard above will see it, skip the HTTP call, and log
-- a warning — so no email will be attempted until you replace
-- this value with the real rotated secret.
--
-- ON CONFLICT DO UPDATE ensures this overwrites the old value
-- even though the row already exists.
--
-- ⚠ Replace this value in the dashboard before email
--   notifications will work again (see step 2 comment above).
-- ------------------------------------------------------------
INSERT INTO public.app_config (key, value)
VALUES ('internal_secret', 'PENDING_ROTATION')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;


-- ------------------------------------------------------------
-- 4. Disable the cleanup_orphaned_auth_users cron job
--
-- pg_cron job id 1 runs nightly at 03:00 and permanently
-- deletes any row from auth.users that has no matching profile.
-- This is a silent data-loss vector: if a user's profile
-- creation fails at signup (a timing or network edge case),
-- their auth account would be erased overnight with no warning
-- or recovery path.
--
-- We unschedule the job here but leave the function itself
-- intact so it can be called manually and deliberately if ever
-- needed. pg_cron jobs 2 and 3 (chat cleanup) are untouched.
-- ------------------------------------------------------------
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE command ILIKE '%cleanup_orphaned_auth_users%';
