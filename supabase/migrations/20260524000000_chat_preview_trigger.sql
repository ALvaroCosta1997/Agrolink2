-- P2.7: Server-side safety net for chat preview updates.
-- The client (App.tsx -> chats.sendMessage) currently writes to two places when a
-- message is sent: the chat_messages table, and a preview on chats.messages + chats.last_update.
-- If the second write fails (network blip, RLS error, etc.) the preview goes stale until
-- the user refreshes. This trigger fires AFTER INSERT on chat_messages and updates the
-- parent chats row so the preview is correct even when the client's preview write fails.
--
-- Defense-in-depth: client writes for instant UX; trigger acts as the durable fallback.
-- Idempotent: if the client already wrote the same preview, the trigger writes the same
-- single-element array again — no duplication possible since it's UPDATE (not INSERT) and
-- the array is replaced wholesale each time.

CREATE OR REPLACE FUNCTION public.update_chat_preview_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.chats
  SET
    last_update = NEW.created_at,
    messages = jsonb_build_array(
      jsonb_build_object(
        'id',         NEW.id,
        'chat_id',    NEW.chat_id,
        'sender_id',  NEW.sender_id,
        'text',       NEW.text,
        'created_at', NEW.created_at,
        'read_at',    NEW.read_at
      )
    )
  WHERE id = NEW.chat_id;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Never block the message insert if the preview update fails.
  RAISE LOG 'update_chat_preview_on_message error: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_chat_preview_on_message() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_chat_preview_on_message() FROM anon, authenticated;

DROP TRIGGER IF EXISTS update_chat_preview_after_message ON public.chat_messages;

CREATE TRIGGER update_chat_preview_after_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_chat_preview_on_message();
