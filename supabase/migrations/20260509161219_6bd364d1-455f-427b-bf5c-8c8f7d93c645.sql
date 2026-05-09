
-- Helper functions
CREATE OR REPLACE FUNCTION public.user_in_subcounty_id(_user_id uuid, _sub_county_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subcounty_assignments
    WHERE user_id = _user_id AND sub_county_id = _sub_county_id AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.user_in_subcounty_name(_user_id uuid, _sub_county_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_subcounty_assignments usa
    JOIN public.sub_counties sc ON sc.id = usa.sub_county_id
    WHERE usa.user_id = _user_id AND usa.is_active = true AND sc.name = _sub_county_name
  )
$$;

CREATE OR REPLACE FUNCTION public.user_in_center_subcounty(_user_id uuid, _center_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.ecde_centers c
    JOIN public.sub_counties sc ON sc.name = c.sub_county
    JOIN public.user_subcounty_assignments usa ON usa.sub_county_id = sc.id
    WHERE c.id = _center_id AND usa.user_id = _user_id AND usa.is_active = true
  )
$$;

REVOKE EXECUTE ON FUNCTION public.user_in_subcounty_id(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_in_subcounty_name(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_in_center_subcounty(uuid, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.user_in_subcounty_id(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_in_subcounty_name(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_in_center_subcounty(uuid, uuid) TO authenticated;

-- Seed default permissions for new role (mirror education_officer-ish but scoped)
INSERT INTO public.permissions (role, resource, can_read, can_create, can_update, can_delete, can_approve_subcounty, can_reject, can_view_reports, can_export, can_manage_inventory, can_record_delivery, can_record_utilization, can_approve_requisitions)
VALUES
  ('sub_county_education_officer','students',  true, true,  true,  false, true, true, true, true, false, false, false, false),
  ('sub_county_education_officer','teachers',  true, true,  true,  false, false,false,true, true, false, false, false, false),
  ('sub_county_education_officer','centers',   true, true,  true,  false, true, true, true, true, false, false, false, false),
  ('sub_county_education_officer','dashboard', true, false, false, false, false,false,true, false,false, false, false, false),
  ('sub_county_education_officer','approvals_students_l1',     true, false, true, false, true, true, false, false, false, false, false, false),
  ('sub_county_education_officer','approvals_centers_l1',      true, false, true, false, true, true, false, false, false, false, false, false),
  ('sub_county_education_officer','approvals_requisitions_l1', true, false, true, false, true, true, false, false, false, false, false, true)
ON CONFLICT DO NOTHING;

-- ECDE Centers: extend SELECT/UPDATE/INSERT
DROP POLICY IF EXISTS "Authenticated users can view centers" ON public.ecde_centers;
CREATE POLICY "Authenticated users can view centers" ON public.ecde_centers
FOR SELECT USING (
  is_admin(auth.uid())
  OR has_role(auth.uid(),'governor')
  OR has_role(auth.uid(),'education_officer')
  OR has_role(auth.uid(),'viewer')
  OR has_role(auth.uid(),'data_entry')
  OR (has_role(auth.uid(),'center_admin') AND id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(),'teacher') AND id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(),'sub_county_education_officer') AND user_in_subcounty_name(auth.uid(), sub_county))
);

DROP POLICY IF EXISTS "Approvers can update centers" ON public.ecde_centers;
CREATE POLICY "Approvers can update centers" ON public.ecde_centers
FOR UPDATE USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'education_officer') AND is_subcounty_manager(auth.uid()))
  OR (has_role(auth.uid(),'sub_county_education_officer') AND user_in_subcounty_name(auth.uid(), sub_county))
);

DROP POLICY IF EXISTS "Submitters can insert pending centers" ON public.ecde_centers;
CREATE POLICY "Submitters can insert pending centers" ON public.ecde_centers
FOR INSERT WITH CHECK (
  is_admin(auth.uid())
  OR has_role(auth.uid(),'center_admin')
  OR has_role(auth.uid(),'education_officer')
  OR (has_role(auth.uid(),'sub_county_education_officer') AND user_in_subcounty_name(auth.uid(), sub_county))
);

-- Students
DROP POLICY IF EXISTS "Users can view students based on role and center" ON public.students;
CREATE POLICY "Users can view students based on role and center" ON public.students
FOR SELECT USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'education_officer') AND is_subcounty_manager(auth.uid()))
  OR has_role(auth.uid(),'data_entry')
  OR (has_role(auth.uid(),'center_admin') AND ((center_id = get_user_center_id(auth.uid())) OR (get_user_center_id(auth.uid()) IS NULL)))
  OR (has_role(auth.uid(),'teacher') AND center_id = get_user_center_id(auth.uid()))
  OR has_role(auth.uid(),'viewer')
  OR has_role(auth.uid(),'governor')
  OR (has_role(auth.uid(),'sub_county_education_officer') AND center_id IS NOT NULL AND user_in_center_subcounty(auth.uid(), center_id))
);

DROP POLICY IF EXISTS "Users can update students" ON public.students;
CREATE POLICY "Users can update students" ON public.students
FOR UPDATE USING (
  is_admin(auth.uid())
  OR has_role(auth.uid(),'data_entry')
  OR (has_role(auth.uid(),'center_admin') AND ((center_id = get_user_center_id(auth.uid())) OR (get_user_center_id(auth.uid()) IS NULL)))
  OR (has_role(auth.uid(),'education_officer') AND is_subcounty_manager(auth.uid()))
  OR (has_role(auth.uid(),'sub_county_education_officer') AND center_id IS NOT NULL AND user_in_center_subcounty(auth.uid(), center_id))
);

DROP POLICY IF EXISTS "Users can insert students" ON public.students;
CREATE POLICY "Users can insert students" ON public.students
FOR INSERT WITH CHECK (
  is_admin(auth.uid())
  OR has_role(auth.uid(),'data_entry')
  OR (has_role(auth.uid(),'center_admin') AND ((center_id = get_user_center_id(auth.uid())) OR (get_user_center_id(auth.uid()) IS NULL)))
  OR has_role(auth.uid(),'education_officer')
  OR (has_role(auth.uid(),'sub_county_education_officer') AND center_id IS NOT NULL AND user_in_center_subcounty(auth.uid(), center_id))
);

DROP POLICY IF EXISTS "Users can delete students" ON public.students;
CREATE POLICY "Users can delete students" ON public.students
FOR DELETE USING (
  is_admin(auth.uid())
  OR has_role(auth.uid(),'data_entry')
  OR (has_role(auth.uid(),'center_admin') AND ((center_id = get_user_center_id(auth.uid())) OR (get_user_center_id(auth.uid()) IS NULL)))
  OR (has_role(auth.uid(),'education_officer') AND is_subcounty_manager(auth.uid()))
  OR (has_role(auth.uid(),'sub_county_education_officer') AND center_id IS NOT NULL AND user_in_center_subcounty(auth.uid(), center_id))
);

-- Teachers
DROP POLICY IF EXISTS "Users can view teachers based on role and center" ON public.teachers;
CREATE POLICY "Users can view teachers based on role and center" ON public.teachers
FOR SELECT USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'education_officer') AND is_subcounty_manager(auth.uid()))
  OR has_role(auth.uid(),'data_entry')
  OR (has_role(auth.uid(),'center_admin') AND ((center_id = get_user_center_id(auth.uid())) OR (get_user_center_id(auth.uid()) IS NULL)))
  OR (has_role(auth.uid(),'teacher') AND center_id = get_user_center_id(auth.uid()))
  OR has_role(auth.uid(),'viewer')
  OR has_role(auth.uid(),'governor')
  OR (has_role(auth.uid(),'sub_county_education_officer') AND center_id IS NOT NULL AND user_in_center_subcounty(auth.uid(), center_id))
);

-- Requisitions
DROP POLICY IF EXISTS "View requisitions by scope" ON public.requisitions;
CREATE POLICY "View requisitions by scope" ON public.requisitions
FOR SELECT USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'education_officer') AND is_subcounty_manager(auth.uid()))
  OR (has_role(auth.uid(),'center_admin') AND center_id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(),'sub_county_education_officer') AND user_in_center_subcounty(auth.uid(), center_id))
);

DROP POLICY IF EXISTS "Update requisitions" ON public.requisitions;
CREATE POLICY "Update requisitions" ON public.requisitions
FOR UPDATE USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'center_admin') AND center_id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(),'education_officer') AND is_subcounty_manager(auth.uid()))
  OR has_role(auth.uid(),'governor')
  OR (has_role(auth.uid(),'sub_county_education_officer') AND user_in_center_subcounty(auth.uid(), center_id))
);

-- Inventory items
DROP POLICY IF EXISTS "View inventory by center scope" ON public.inventory_items;
CREATE POLICY "View inventory by center scope" ON public.inventory_items
FOR SELECT USING (
  center_id IS NULL
  OR is_admin(auth.uid())
  OR (has_role(auth.uid(),'education_officer') AND is_subcounty_manager(auth.uid()))
  OR (has_role(auth.uid(),'center_admin') AND center_id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(),'teacher') AND center_id = get_user_center_id(auth.uid()))
  OR has_role(auth.uid(),'governor')
  OR (has_role(auth.uid(),'sub_county_education_officer') AND user_in_center_subcounty(auth.uid(), center_id))
);

-- Ministry deliveries
DROP POLICY IF EXISTS "View deliveries by scope" ON public.ministry_deliveries;
CREATE POLICY "View deliveries by scope" ON public.ministry_deliveries
FOR SELECT USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'education_officer') AND is_subcounty_manager(auth.uid()))
  OR (has_role(auth.uid(),'center_admin') AND center_id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(),'teacher') AND center_id = get_user_center_id(auth.uid()))
  OR has_role(auth.uid(),'governor')
  OR (has_role(auth.uid(),'sub_county_education_officer') AND user_in_center_subcounty(auth.uid(), center_id))
);

-- Stock transactions
DROP POLICY IF EXISTS "View tx by center scope" ON public.stock_transactions;
CREATE POLICY "View tx by center scope" ON public.stock_transactions
FOR SELECT USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'education_officer') AND is_subcounty_manager(auth.uid()))
  OR (has_role(auth.uid(),'center_admin') AND center_id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(),'teacher') AND center_id = get_user_center_id(auth.uid()))
  OR has_role(auth.uid(),'governor')
  OR (has_role(auth.uid(),'sub_county_education_officer') AND user_in_center_subcounty(auth.uid(), center_id))
);

-- Utilization logs
DROP POLICY IF EXISTS "View utilization by scope" ON public.utilization_logs;
CREATE POLICY "View utilization by scope" ON public.utilization_logs
FOR SELECT USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'education_officer') AND is_subcounty_manager(auth.uid()))
  OR (has_role(auth.uid(),'center_admin') AND center_id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(),'teacher') AND center_id = get_user_center_id(auth.uid()))
  OR has_role(auth.uid(),'governor')
  OR (has_role(auth.uid(),'sub_county_education_officer') AND user_in_center_subcounty(auth.uid(), center_id))
);
