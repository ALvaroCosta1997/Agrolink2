-- P2.8: Track notification emails sent per receiver to throttle bursts.
-- Read by the notify-new-message edge function: if the receiver got an email
-- in the last 30 minutes, skip sending. This caps a single recipient at ~2
-- emails/hour even if they receive a flood of messages, keeping us under the
-- Resend free-tier limit (100/day) without losing the first message of each burst.

CREATE TABLE IF NOT EXISTS public.email_sends (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_user_sent
  ON public.email_sends (user_id, sent_at DESC);

ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.email_sends FROM anon, authenticated;
