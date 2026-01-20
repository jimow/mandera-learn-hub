-- Fix the permissive INSERT policy by making it restrictive (only allow inserts via trigger/service role)
DROP POLICY "Service role can insert notifications" ON public.notifications;

-- Create a more restrictive policy - notifications are created by database triggers with SECURITY DEFINER
-- Regular users cannot insert notifications directly
CREATE POLICY "No direct insert by users"
  ON public.notifications
  FOR INSERT
  WITH CHECK (false);