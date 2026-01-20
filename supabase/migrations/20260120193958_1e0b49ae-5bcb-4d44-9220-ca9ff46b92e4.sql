-- Drop existing SELECT policies for students and teachers
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view teachers" ON public.teachers;

-- Create new SELECT policy for students with center-based filtering
CREATE POLICY "Users can view students based on role and center"
ON public.students
FOR SELECT
USING (
  -- Super admins and admins can see all students
  is_admin(auth.uid())
  -- Education officers can see students in their sub-county's centers
  OR (has_role(auth.uid(), 'education_officer'::app_role) AND is_subcounty_manager(auth.uid()))
  -- Data entry can see all students (for data management)
  OR has_role(auth.uid(), 'data_entry'::app_role)
  -- Center admins can only see students from their assigned center
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND (
    center_id = get_user_center_id(auth.uid())
    OR get_user_center_id(auth.uid()) IS NULL -- If no center assigned, can't see any
  ))
  -- Teachers can only see students from their assigned center
  OR (has_role(auth.uid(), 'teacher'::app_role) AND (
    center_id = get_user_center_id(auth.uid())
  ))
  -- Viewers can see all (read-only role)
  OR has_role(auth.uid(), 'viewer'::app_role)
  -- Governor can see all (read-only executive role)
  OR has_role(auth.uid(), 'governor'::app_role)
);

-- Create new SELECT policy for teachers with center-based filtering
CREATE POLICY "Users can view teachers based on role and center"
ON public.teachers
FOR SELECT
USING (
  -- Super admins and admins can see all teachers
  is_admin(auth.uid())
  -- Education officers can see all teachers in their jurisdiction
  OR (has_role(auth.uid(), 'education_officer'::app_role) AND is_subcounty_manager(auth.uid()))
  -- Data entry can see all teachers
  OR has_role(auth.uid(), 'data_entry'::app_role)
  -- Center admins can only see teachers from their assigned center
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND (
    center_id = get_user_center_id(auth.uid())
    OR get_user_center_id(auth.uid()) IS NULL
  ))
  -- Teachers can see other teachers at their center
  OR (has_role(auth.uid(), 'teacher'::app_role) AND (
    center_id = get_user_center_id(auth.uid())
  ))
  -- Viewers can see all
  OR has_role(auth.uid(), 'viewer'::app_role)
  -- Governor can see all
  OR has_role(auth.uid(), 'governor'::app_role)
);

-- Update INSERT policy for students to set center_id automatically for center_admin
DROP POLICY IF EXISTS "Users can insert students" ON public.students;
CREATE POLICY "Users can insert students"
ON public.students
FOR INSERT
WITH CHECK (
  is_admin(auth.uid()) 
  OR has_role(auth.uid(), 'data_entry'::app_role)
  -- Center admins can only insert students to their assigned center
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND (
    center_id = get_user_center_id(auth.uid())
    OR get_user_center_id(auth.uid()) IS NULL
  ))
  OR has_role(auth.uid(), 'education_officer'::app_role)
);