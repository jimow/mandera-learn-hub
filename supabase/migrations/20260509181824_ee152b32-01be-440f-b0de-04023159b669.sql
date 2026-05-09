DROP POLICY IF EXISTS "Users can view students based on role and center" ON public.students;

CREATE POLICY "Users can view students based on role and center"
ON public.students
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'data_entry'::app_role)
  OR (
    NOT public.has_role(auth.uid(), 'education_officer'::app_role)
    AND NOT public.has_role(auth.uid(), 'sub_county_education_officer'::app_role)
    AND (
      public.has_role(auth.uid(), 'viewer'::app_role)
      OR public.has_role(auth.uid(), 'governor'::app_role)
    )
  )
  OR (
    public.has_role(auth.uid(), 'center_admin'::app_role)
    AND center_id = public.get_user_center_id(auth.uid())
  )
  OR (
    public.has_role(auth.uid(), 'teacher'::app_role)
    AND center_id = public.get_user_center_id(auth.uid())
  )
  OR (
    public.has_role(auth.uid(), 'education_officer'::app_role)
    AND center_id IS NOT NULL
    AND public.user_in_center_subcounty(auth.uid(), center_id)
  )
  OR (
    public.has_role(auth.uid(), 'sub_county_education_officer'::app_role)
    AND center_id IS NOT NULL
    AND public.user_in_center_subcounty(auth.uid(), center_id)
  )
);

DROP POLICY IF EXISTS "Users can view teachers based on role and center" ON public.teachers;

CREATE POLICY "Users can view teachers based on role and center"
ON public.teachers
FOR SELECT
USING (
  public.is_admin(auth.uid())
  OR public.has_role(auth.uid(), 'data_entry'::app_role)
  OR (
    NOT public.has_role(auth.uid(), 'education_officer'::app_role)
    AND NOT public.has_role(auth.uid(), 'sub_county_education_officer'::app_role)
    AND (
      public.has_role(auth.uid(), 'viewer'::app_role)
      OR public.has_role(auth.uid(), 'governor'::app_role)
    )
  )
  OR (
    public.has_role(auth.uid(), 'center_admin'::app_role)
    AND center_id = public.get_user_center_id(auth.uid())
  )
  OR (
    public.has_role(auth.uid(), 'teacher'::app_role)
    AND center_id = public.get_user_center_id(auth.uid())
  )
  OR (
    public.has_role(auth.uid(), 'education_officer'::app_role)
    AND center_id IS NOT NULL
    AND public.user_in_center_subcounty(auth.uid(), center_id)
  )
  OR (
    public.has_role(auth.uid(), 'sub_county_education_officer'::app_role)
    AND center_id IS NOT NULL
    AND public.user_in_center_subcounty(auth.uid(), center_id)
  )
);