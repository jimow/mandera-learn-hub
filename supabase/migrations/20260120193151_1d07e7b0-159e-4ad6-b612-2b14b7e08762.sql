-- Add can_transfer column to permissions table
ALTER TABLE public.permissions 
ADD COLUMN IF NOT EXISTS can_transfer boolean DEFAULT false;

-- Create teacher_transfers table to track transfer history
CREATE TABLE IF NOT EXISTS public.teacher_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  from_center_id uuid REFERENCES public.ecde_centers(id) ON DELETE SET NULL,
  to_center_id uuid NOT NULL REFERENCES public.ecde_centers(id) ON DELETE CASCADE,
  transfer_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  transferred_by uuid,
  status text NOT NULL DEFAULT 'completed',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.teacher_transfers ENABLE ROW LEVEL SECURITY;

-- RLS policies for teacher_transfers
CREATE POLICY "Authenticated users can view teacher transfers"
ON public.teacher_transfers
FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Users with transfer permission can manage transfers"
ON public.teacher_transfers
FOR ALL
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_teacher_transfers_updated_at
BEFORE UPDATE ON public.teacher_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update has_permission function to include transfer action
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
        (_action = 'delete' AND p.can_delete = true) OR
        (_action = 'transfer' AND p.can_transfer = true)
      )
  )
$$;