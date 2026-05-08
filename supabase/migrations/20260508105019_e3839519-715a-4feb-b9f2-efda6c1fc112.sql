
-- Make inventory items optionally ministry-level (no center)
ALTER TABLE public.inventory_items ALTER COLUMN center_id DROP NOT NULL;

-- Add new requisition_status values for two-level approval
ALTER TYPE requisition_status ADD VALUE IF NOT EXISTS 'approved_l1';
ALTER TYPE requisition_status ADD VALUE IF NOT EXISTS 'approved_l2';

-- Add 2-level approval tracking + AI anomaly fields on requisitions
ALTER TABLE public.requisitions
  ADD COLUMN IF NOT EXISTS approved_l1_by uuid,
  ADD COLUMN IF NOT EXISTS approved_l1_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_l1_notes text,
  ADD COLUMN IF NOT EXISTS approved_l2_by uuid,
  ADD COLUMN IF NOT EXISTS approved_l2_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_l2_notes text,
  ADD COLUMN IF NOT EXISTS ai_anomaly_score numeric,
  ADD COLUMN IF NOT EXISTS ai_anomaly_severity text,
  ADD COLUMN IF NOT EXISTS ai_anomaly_reason text,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz;

-- Update RLS for ministry-level inventory items (center_id IS NULL means ministry catalog)
DROP POLICY IF EXISTS "View inventory by center scope" ON public.inventory_items;
CREATE POLICY "View inventory by center scope"
ON public.inventory_items FOR SELECT
USING (
  center_id IS NULL  -- ministry catalog visible to all authenticated users with role
  OR is_admin(auth.uid())
  OR (has_role(auth.uid(), 'education_officer'::app_role) AND is_subcounty_manager(auth.uid()))
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(), 'teacher'::app_role) AND center_id = get_user_center_id(auth.uid()))
  OR has_role(auth.uid(), 'governor'::app_role)
);

DROP POLICY IF EXISTS "Insert inventory by center scope" ON public.inventory_items;
CREATE POLICY "Insert inventory by center scope"
ON public.inventory_items FOR INSERT
WITH CHECK (
  is_admin(auth.uid())  -- admins create ministry catalog (center_id NULL) or any
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
);

DROP POLICY IF EXISTS "Update inventory by center scope" ON public.inventory_items;
CREATE POLICY "Update inventory by center scope"
ON public.inventory_items FOR UPDATE
USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
);

DROP POLICY IF EXISTS "Delete inventory by center scope" ON public.inventory_items;
CREATE POLICY "Delete inventory by center scope"
ON public.inventory_items FOR DELETE
USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
);

-- Allow education officers (L1) and ministry/admin (L2) to update requisitions for approvals
DROP POLICY IF EXISTS "Update requisitions" ON public.requisitions;
CREATE POLICY "Update requisitions"
ON public.requisitions FOR UPDATE
USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(), 'education_officer'::app_role) AND is_subcounty_manager(auth.uid()))
  OR has_role(auth.uid(), 'governor'::app_role)
);
