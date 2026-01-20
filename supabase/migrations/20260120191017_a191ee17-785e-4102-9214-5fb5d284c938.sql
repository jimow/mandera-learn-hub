-- Drop the existing overly restrictive policy
DROP POLICY IF EXISTS "Users can manage students based on role" ON public.students;

-- Create separate policies for better control

-- INSERT: Allow admins, data_entry, center_admin, and education_officer to insert students
CREATE POLICY "Users can insert students"
ON public.students
FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) 
  OR has_role(auth.uid(), 'data_entry'::app_role)
  OR has_role(auth.uid(), 'center_admin'::app_role)
  OR has_role(auth.uid(), 'education_officer'::app_role)
);

-- UPDATE: More restrictive - center_admin can only update their center's students
CREATE POLICY "Users can update students"
ON public.students
FOR UPDATE
USING (
  is_admin(auth.uid()) 
  OR has_role(auth.uid(), 'data_entry'::app_role)
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND (center_id = get_user_center_id(auth.uid()) OR get_user_center_id(auth.uid()) IS NULL))
  OR (has_role(auth.uid(), 'education_officer'::app_role) AND is_subcounty_manager(auth.uid()))
);

-- DELETE: Same as update
CREATE POLICY "Users can delete students"
ON public.students
FOR DELETE
USING (
  is_admin(auth.uid()) 
  OR has_role(auth.uid(), 'data_entry'::app_role)
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND (center_id = get_user_center_id(auth.uid()) OR get_user_center_id(auth.uid()) IS NULL))
  OR (has_role(auth.uid(), 'education_officer'::app_role) AND is_subcounty_manager(auth.uid()))
);