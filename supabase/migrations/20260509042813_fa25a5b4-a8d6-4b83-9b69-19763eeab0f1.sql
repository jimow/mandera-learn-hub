-- 1. Add approval workflow columns to ecde_centers
ALTER TABLE public.ecde_centers
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_l1_by uuid,
  ADD COLUMN IF NOT EXISTS approved_l1_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_l2_by uuid,
  ADD COLUMN IF NOT EXISTS approved_l2_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS submitted_by uuid;

-- Existing centers default to fully approved so they keep working
UPDATE public.ecde_centers SET approval_status = 'approved' WHERE approval_status = 'pending' AND created_at < now();

-- Allow center_admin and education_officer to submit a new center (it will start as pending)
DROP POLICY IF EXISTS "Submitters can insert pending centers" ON public.ecde_centers;
CREATE POLICY "Submitters can insert pending centers"
ON public.ecde_centers
FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  OR has_role(auth.uid(), 'center_admin')
  OR has_role(auth.uid(), 'education_officer')
);

-- Allow education_officer to update centers (for L1 approval), governor read-only via existing select
DROP POLICY IF EXISTS "Approvers can update centers" ON public.ecde_centers;
CREATE POLICY "Approvers can update centers"
ON public.ecde_centers
FOR UPDATE
USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'education_officer') AND is_subcounty_manager(auth.uid()))
);

-- 2. Seed new granular approval permission resources
-- We add: approvals_students_l1/l2, approvals_centers_l1/l2, approvals_requisitions_l1/l2
-- Mirror existing approvals_level1/level2 to approvals_students_l1/l2 for back-compat

INSERT INTO public.permissions (role, resource, can_read, can_update, can_create)
SELECT role, 'approvals_students_l1', COALESCE(can_read,false), COALESCE(can_update,false), false
FROM public.permissions WHERE resource = 'approvals_level1'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (role, resource, can_read, can_update, can_create)
SELECT role, 'approvals_students_l2', COALESCE(can_read,false), COALESCE(can_update,false), false
FROM public.permissions WHERE resource = 'approvals_level2'
ON CONFLICT DO NOTHING;

-- Seed center & requisition approval rows for every role that already has any permission entry
-- Defaults: only admin-like roles get approval rights
DO $$
DECLARE
  r record;
  v_l1_read boolean;
  v_l1_update boolean;
  v_l2_read boolean;
  v_l2_update boolean;
BEGIN
  FOR r IN SELECT DISTINCT role FROM public.permissions LOOP
    -- L1 defaults: education_officer/admin/super_admin can read+approve
    v_l1_read := r.role IN ('super_admin','admin','education_officer');
    v_l1_update := r.role IN ('super_admin','admin','education_officer');
    v_l2_read := r.role IN ('super_admin','admin','governor');
    v_l2_update := r.role IN ('super_admin','admin');

    INSERT INTO public.permissions (role, resource, can_read, can_update)
    VALUES (r.role, 'approvals_centers_l1', v_l1_read, v_l1_update)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.permissions (role, resource, can_read, can_update)
    VALUES (r.role, 'approvals_centers_l2', v_l2_read, v_l2_update)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.permissions (role, resource, can_read, can_update)
    VALUES (r.role, 'approvals_requisitions_l1', v_l1_read, v_l1_update)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.permissions (role, resource, can_read, can_update)
    VALUES (r.role, 'approvals_requisitions_l2', v_l2_read, v_l2_update)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;