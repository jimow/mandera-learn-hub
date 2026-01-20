-- 1. Create sub_counties table with Mandera's 12 sub-counties
CREATE TABLE public.sub_counties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sub_counties ENABLE ROW LEVEL SECURITY;

-- Policies for sub_counties
CREATE POLICY "Authenticated users can view sub_counties"
ON public.sub_counties FOR SELECT
TO authenticated
USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can manage sub_counties"
ON public.sub_counties FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- 2. Create wards table
CREATE TABLE public.wards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  sub_county_id UUID NOT NULL REFERENCES public.sub_counties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, sub_county_id)
);

-- Enable RLS
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;

-- Policies for wards
CREATE POLICY "Authenticated users can view wards"
ON public.wards FOR SELECT
TO authenticated
USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can manage wards"
ON public.wards FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- 3. Insert Mandera's 12 sub-counties and their wards
INSERT INTO public.sub_counties (name, code) VALUES
  ('Mandera East', 'MDE'),
  ('Mandera West', 'MDW'),
  ('Mandera North', 'MDN'),
  ('Mandera South', 'MDS'),
  ('Banissa', 'BNS'),
  ('Lafey', 'LFY'),
  ('Kutulo', 'KTL'),
  ('Takaba', 'TKB'),
  ('Kiliwehiri', 'KLW'),
  ('Fino', 'FNO'),
  ('Ashabito', 'ASB'),
  ('Elwak', 'ELW');

-- Insert wards for each sub-county
-- Mandera East
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Neboi', 'MDE-NEB', id FROM public.sub_counties WHERE code = 'MDE';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Township', 'MDE-TWN', id FROM public.sub_counties WHERE code = 'MDE';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Arabia', 'MDE-ARB', id FROM public.sub_counties WHERE code = 'MDE';

-- Mandera West
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Takaba South', 'MDW-TKS', id FROM public.sub_counties WHERE code = 'MDW';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Dandu', 'MDW-DND', id FROM public.sub_counties WHERE code = 'MDW';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Gither', 'MDW-GTH', id FROM public.sub_counties WHERE code = 'MDW';

-- Mandera North
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Ashabito', 'MDN-ASB', id FROM public.sub_counties WHERE code = 'MDN';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Guticha', 'MDN-GTC', id FROM public.sub_counties WHERE code = 'MDN';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Morothile', 'MDN-MRT', id FROM public.sub_counties WHERE code = 'MDN';

-- Mandera South
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Wargadud', 'MDS-WRG', id FROM public.sub_counties WHERE code = 'MDS';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Elwak South', 'MDS-ELS', id FROM public.sub_counties WHERE code = 'MDS';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Shimbir Fatuma', 'MDS-SHF', id FROM public.sub_counties WHERE code = 'MDS';

-- Banissa
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Banissa', 'BNS-BNS', id FROM public.sub_counties WHERE code = 'BNS';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Derkhale', 'BNS-DRK', id FROM public.sub_counties WHERE code = 'BNS';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Guba', 'BNS-GBA', id FROM public.sub_counties WHERE code = 'BNS';

-- Lafey
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Lafey', 'LFY-LFY', id FROM public.sub_counties WHERE code = 'LFY';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Sala', 'LFY-SLA', id FROM public.sub_counties WHERE code = 'LFY';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Waranqara', 'LFY-WRQ', id FROM public.sub_counties WHERE code = 'LFY';

-- Kutulo
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Kutulo', 'KTL-KTL', id FROM public.sub_counties WHERE code = 'KTL';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Rhamu', 'KTL-RHM', id FROM public.sub_counties WHERE code = 'KTL';

-- Takaba
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Takaba', 'TKB-TKB', id FROM public.sub_counties WHERE code = 'TKB';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Takaba North', 'TKB-TKN', id FROM public.sub_counties WHERE code = 'TKB';

-- Kiliwehiri
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Kiliwehiri', 'KLW-KLW', id FROM public.sub_counties WHERE code = 'KLW';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Libehiya', 'KLW-LBH', id FROM public.sub_counties WHERE code = 'KLW';

-- Fino
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Fino', 'FNO-FNO', id FROM public.sub_counties WHERE code = 'FNO';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Hareri', 'FNO-HRR', id FROM public.sub_counties WHERE code = 'FNO';

-- Ashabito sub-county
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Ashabito Town', 'ASB-AST', id FROM public.sub_counties WHERE code = 'ASB';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Khalalio', 'ASB-KHL', id FROM public.sub_counties WHERE code = 'ASB';

-- Elwak
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Elwak North', 'ELW-ELN', id FROM public.sub_counties WHERE code = 'ELW';
INSERT INTO public.wards (name, code, sub_county_id) 
SELECT 'Elwak Town', 'ELW-ELT', id FROM public.sub_counties WHERE code = 'ELW';

-- 4. Add columns to ecde_centers for geo-location and ward reference
ALTER TABLE public.ecde_centers 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS ward_id UUID REFERENCES public.wards(id);

-- 5. Create user_center_assignments table (for center admins)
CREATE TABLE public.user_center_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  center_id UUID NOT NULL REFERENCES public.ecde_centers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, center_id)
);

ALTER TABLE public.user_center_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own center assignments"
ON public.user_center_assignments FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage center assignments"
ON public.user_center_assignments FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- 6. Create user_subcounty_assignments table (for sub-county managers)
CREATE TABLE public.user_subcounty_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sub_county_id UUID NOT NULL REFERENCES public.sub_counties(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, sub_county_id)
);

ALTER TABLE public.user_subcounty_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subcounty assignments"
ON public.user_subcounty_assignments FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage subcounty assignments"
ON public.user_subcounty_assignments FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- 7. Create approval status enum
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved_subcounty', 'approved_ministry', 'rejected');

-- 8. Add approval workflow columns to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS approval_status public.approval_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by_subcounty UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_by_ministry UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS subcounty_approval_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ministry_approval_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 9. Create function to get user's assigned center
CREATE OR REPLACE FUNCTION public.get_user_center_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT center_id 
  FROM public.user_center_assignments 
  WHERE user_id = _user_id AND is_active = true 
  LIMIT 1
$$;

-- 10. Create function to check if user manages a sub-county
CREATE OR REPLACE FUNCTION public.is_subcounty_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_subcounty_assignments 
    WHERE user_id = _user_id AND is_active = true
  )
$$;

-- 11. Create function to get user's assigned sub-county
CREATE OR REPLACE FUNCTION public.get_user_subcounty_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sub_county_id 
  FROM public.user_subcounty_assignments 
  WHERE user_id = _user_id AND is_active = true 
  LIMIT 1
$$;

-- 12. Update RLS policy for students to allow center_admin to create students for their center
DROP POLICY IF EXISTS "Admins and data entry can manage students" ON public.students;

CREATE POLICY "Users can manage students based on role"
ON public.students FOR ALL
TO authenticated
USING (
  is_admin(auth.uid()) 
  OR has_role(auth.uid(), 'data_entry'::app_role)
  OR (
    has_role(auth.uid(), 'center_admin'::app_role) 
    AND center_id = get_user_center_id(auth.uid())
  )
  OR (
    has_role(auth.uid(), 'education_officer'::app_role)
    AND is_subcounty_manager(auth.uid())
  )
)
WITH CHECK (
  is_admin(auth.uid()) 
  OR has_role(auth.uid(), 'data_entry'::app_role)
  OR (
    has_role(auth.uid(), 'center_admin'::app_role) 
    AND center_id = get_user_center_id(auth.uid())
  )
  OR (
    has_role(auth.uid(), 'education_officer'::app_role)
    AND is_subcounty_manager(auth.uid())
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_sub_counties_updated_at
BEFORE UPDATE ON public.sub_counties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wards_updated_at
BEFORE UPDATE ON public.wards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();