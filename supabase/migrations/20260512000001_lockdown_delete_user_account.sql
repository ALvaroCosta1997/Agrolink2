-- The CREATE FUNCTION default is GRANT EXECUTE TO PUBLIC, which anon inherits.
-- We need to revoke from PUBLIC explicitly, not just from anon.
REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
