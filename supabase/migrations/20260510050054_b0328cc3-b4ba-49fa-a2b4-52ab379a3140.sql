
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'excused');

CREATE TABLE public.student_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  center_id uuid NOT NULL,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  reason text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, attendance_date)
);

CREATE INDEX idx_student_attendance_date ON public.student_attendance(attendance_date);
CREATE INDEX idx_student_attendance_center ON public.student_attendance(center_id, attendance_date);

CREATE TABLE public.teacher_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  center_id uuid NOT NULL,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  reason text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, attendance_date)
);

CREATE INDEX idx_teacher_attendance_date ON public.teacher_attendance(attendance_date);
CREATE INDEX idx_teacher_attendance_center ON public.teacher_attendance(center_id, attendance_date);

ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;

-- Student attendance policies
CREATE POLICY "View student attendance by scope"
ON public.student_attendance FOR SELECT
USING (
  is_admin(auth.uid())
  OR has_role(auth.uid(), 'governor'::app_role)
  OR has_role(auth.uid(), 'viewer'::app_role)
  OR has_role(auth.uid(), 'data_entry'::app_role)
  OR ((has_role(auth.uid(), 'center_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)) AND center_id = get_user_center_id(auth.uid()))
  OR ((has_role(auth.uid(), 'education_officer'::app_role) OR has_role(auth.uid(), 'sub_county_education_officer'::app_role)) AND user_in_center_subcounty(auth.uid(), center_id))
);

CREATE POLICY "Insert student attendance by scope"
ON public.student_attendance FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  OR has_role(auth.uid(), 'data_entry'::app_role)
  OR ((has_role(auth.uid(), 'center_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)) AND center_id = get_user_center_id(auth.uid()))
  OR ((has_role(auth.uid(), 'education_officer'::app_role) OR has_role(auth.uid(), 'sub_county_education_officer'::app_role)) AND user_in_center_subcounty(auth.uid(), center_id))
);

CREATE POLICY "Update student attendance by scope"
ON public.student_attendance FOR UPDATE
USING (
  is_admin(auth.uid())
  OR ((has_role(auth.uid(), 'center_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)) AND center_id = get_user_center_id(auth.uid()))
  OR ((has_role(auth.uid(), 'education_officer'::app_role) OR has_role(auth.uid(), 'sub_county_education_officer'::app_role)) AND user_in_center_subcounty(auth.uid(), center_id))
);

CREATE POLICY "Delete student attendance by scope"
ON public.student_attendance FOR DELETE
USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
);

-- Teacher attendance policies
CREATE POLICY "View teacher attendance by scope"
ON public.teacher_attendance FOR SELECT
USING (
  is_admin(auth.uid())
  OR has_role(auth.uid(), 'governor'::app_role)
  OR has_role(auth.uid(), 'viewer'::app_role)
  OR has_role(auth.uid(), 'data_entry'::app_role)
  OR ((has_role(auth.uid(), 'center_admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role)) AND center_id = get_user_center_id(auth.uid()))
  OR ((has_role(auth.uid(), 'education_officer'::app_role) OR has_role(auth.uid(), 'sub_county_education_officer'::app_role)) AND user_in_center_subcounty(auth.uid(), center_id))
);

CREATE POLICY "Insert teacher attendance by scope"
ON public.teacher_attendance FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  OR has_role(auth.uid(), 'data_entry'::app_role)
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
  OR ((has_role(auth.uid(), 'education_officer'::app_role) OR has_role(auth.uid(), 'sub_county_education_officer'::app_role)) AND user_in_center_subcounty(auth.uid(), center_id))
);

CREATE POLICY "Update teacher attendance by scope"
ON public.teacher_attendance FOR UPDATE
USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
  OR ((has_role(auth.uid(), 'education_officer'::app_role) OR has_role(auth.uid(), 'sub_county_education_officer'::app_role)) AND user_in_center_subcounty(auth.uid(), center_id))
);

CREATE POLICY "Delete teacher attendance by scope"
ON public.teacher_attendance FOR DELETE
USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
);

CREATE TRIGGER trg_student_attendance_updated
  BEFORE UPDATE ON public.student_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_teacher_attendance_updated
  BEFORE UPDATE ON public.teacher_attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
