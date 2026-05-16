-- P1.5: Annotate delete_user_account to document why authenticated users
-- intentionally have EXECUTE privilege on this SECURITY DEFINER function.
-- The advisor warns about SECURITY DEFINER functions callable by signed-in
-- users; in this case the design is intentional — the function internally
-- restricts deletion to the caller's own row via auth.uid().
COMMENT ON FUNCTION public.delete_user_account() IS
'SECURITY DEFINER + EXECUTE granted to authenticated is INTENTIONAL. The function uses auth.uid() to ensure each caller can only delete their own data. Do NOT revoke EXECUTE from authenticated without first migrating callers to an edge-function-only invocation pattern.';
