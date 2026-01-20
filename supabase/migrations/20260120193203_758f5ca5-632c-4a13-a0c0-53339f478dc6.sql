-- Drop and recreate get_user_permissions with transfer column
DROP FUNCTION IF EXISTS public.get_user_permissions(uuid);

CREATE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(resource text, can_create boolean, can_read boolean, can_update boolean, can_delete boolean, can_transfer boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.resource,
    bool_or(p.can_create) as can_create,
    bool_or(p.can_read) as can_read,
    bool_or(p.can_update) as can_update,
    bool_or(p.can_delete) as can_delete,
    bool_or(p.can_transfer) as can_transfer
  FROM public.user_roles ur
  JOIN public.permissions p ON ur.role = p.role
  WHERE ur.user_id = _user_id
  GROUP BY p.resource
$$;

-- Set default transfer permissions for admin roles on teachers resource
UPDATE public.permissions 
SET can_transfer = true 
WHERE role IN ('super_admin', 'admin') AND resource = 'teachers';