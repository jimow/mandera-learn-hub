-- Create custom_roles table for super admin to create additional roles
CREATE TABLE public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on custom_roles
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage custom roles
CREATE POLICY "Super admins can manage custom roles"
ON public.custom_roles
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- All authenticated users with any role can view custom roles
CREATE POLICY "Authenticated users can view custom roles"
ON public.custom_roles
FOR SELECT
USING (has_any_role(auth.uid()));

-- Create permissions table to define what each role can do
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  resource TEXT NOT NULL,
  can_create BOOLEAN DEFAULT false,
  can_read BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role, resource)
);

-- Enable RLS on permissions
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage permissions
CREATE POLICY "Super admins can manage permissions"
ON public.permissions
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- All authenticated users can view permissions
CREATE POLICY "Authenticated users can view permissions"
ON public.permissions
FOR SELECT
USING (has_any_role(auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_custom_roles_updated_at
BEFORE UPDATE ON public.custom_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at
BEFORE UPDATE ON public.permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check if user has permission for a resource action
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _resource text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.permissions p ON ur.role = p.role
    WHERE ur.user_id = _user_id
      AND p.resource = _resource
      AND (
        (_action = 'create' AND p.can_create = true) OR
        (_action = 'read' AND p.can_read = true) OR
        (_action = 'update' AND p.can_update = true) OR
        (_action = 'delete' AND p.can_delete = true)
      )
  )
$$;

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(resource text, can_create boolean, can_read boolean, can_update boolean, can_delete boolean)
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
    bool_or(p.can_delete) as can_delete
  FROM public.user_roles ur
  JOIN public.permissions p ON ur.role = p.role
  WHERE ur.user_id = _user_id
  GROUP BY p.resource
$$;