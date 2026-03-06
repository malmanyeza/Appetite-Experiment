-- Create an RPC to securely allow a user to completely delete their account and auth record
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- This securely deletes the authenticated user from the underlying Supabase Auth table.
  -- Since 'auth.uid()' is used, a user can strictly only ever delete themselves.
  -- Proper Foreign Key cascading handles dropping their profiles, roles, and records.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
