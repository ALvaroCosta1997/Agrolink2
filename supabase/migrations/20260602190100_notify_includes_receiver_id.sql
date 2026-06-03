-- P2.8: Add receiver_id to the notify_new_chat_message payload so the edge
-- function can perform per-user throttle lookups against the email_sends table.
-- Previously the payload only carried receiver_email; this adds receiver_id so
-- the function can check / record rows in email_sends by user_id.

CREATE OR REPLACE FUNCTION public.notify_new_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  receiver_id     uuid;
  receiver_email  text;
  receiver_name   text;
  sender_name     text;
  listing_species text;
  chat_record     record;
  edge_url        text := 'https://odznjlpzknczzutgirvk.supabase.co/functions/v1/notify-new-message';
  secret          text;
  payload         jsonb;
BEGIN
  SELECT value INTO secret
  FROM public.app_config
  WHERE key = 'internal_secret';

  IF secret IS NULL OR secret = 'PENDING_ROTATION' THEN
    RAISE LOG 'notify_new_chat_message: internal_secret not configured — skipping email notification for chat_message %', NEW.id;
    RETURN NEW;
  END IF;

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
    'receiver_id',     receiver_id,
    'receiver_email',  receiver_email,
    'receiver_name',   receiver_name,
    'sender_name',     sender_name,
    'listing_species', listing_species,
    'message_preview', left(NEW.text, 100)
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
$$;
