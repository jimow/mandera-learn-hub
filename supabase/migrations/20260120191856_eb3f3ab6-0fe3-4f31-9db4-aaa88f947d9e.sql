
-- Create counties table
CREATE TABLE public.counties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on counties
ALTER TABLE public.counties ENABLE ROW LEVEL SECURITY;

-- RLS policies for counties
CREATE POLICY "Authenticated users can view counties"
ON public.counties
FOR SELECT
USING (has_any_role(auth.uid()));

CREATE POLICY "Admins can manage counties"
ON public.counties
FOR ALL
USING (is_admin(auth.uid()));

-- Add county_id to sub_counties
ALTER TABLE public.sub_counties 
ADD COLUMN county_id uuid REFERENCES public.counties(id) ON DELETE CASCADE;

-- Create trigger for updated_at on counties
CREATE TRIGGER update_counties_updated_at
BEFORE UPDATE ON public.counties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
