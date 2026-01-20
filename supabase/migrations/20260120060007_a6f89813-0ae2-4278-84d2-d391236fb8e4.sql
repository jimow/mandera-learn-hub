-- Create a security definer function to check if any super_admin exists
CREATE OR REPLACE FUNCTION public.super_admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'super_admin'
  )
$$;

-- Add policy to allow first super_admin assignment when none exists
CREATE POLICY "Allow first super_admin assignment"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  role = 'super_admin' 
  AND auth.uid() = user_id 
  AND NOT public.super_admin_exists()
);