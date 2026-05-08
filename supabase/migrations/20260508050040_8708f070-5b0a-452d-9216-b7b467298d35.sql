
-- 1) DELIVERIES from Ministry
CREATE TABLE public.ministry_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL,
  item_id UUID,
  item_name TEXT NOT NULL,
  category inventory_category NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivered_by TEXT,
  reference_number TEXT,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ministry_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View deliveries by scope" ON public.ministry_deliveries FOR SELECT USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'education_officer') AND is_subcounty_manager(auth.uid()))
  OR (has_role(auth.uid(),'center_admin') AND center_id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(),'teacher') AND center_id = get_user_center_id(auth.uid()))
  OR has_role(auth.uid(),'governor')
);
CREATE POLICY "Insert deliveries by scope" ON public.ministry_deliveries FOR INSERT WITH CHECK (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'center_admin') AND center_id = get_user_center_id(auth.uid()))
);
CREATE POLICY "Update deliveries by scope" ON public.ministry_deliveries FOR UPDATE USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'center_admin') AND center_id = get_user_center_id(auth.uid()))
);
CREATE POLICY "Delete deliveries by scope" ON public.ministry_deliveries FOR DELETE USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'center_admin') AND center_id = get_user_center_id(auth.uid()))
);

-- 2) UTILIZATION logs
CREATE TABLE public.utilization_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL,
  item_id UUID NOT NULL,
  quantity NUMERIC NOT NULL,
  utilization_date DATE NOT NULL DEFAULT CURRENT_DATE,
  purpose TEXT,
  beneficiaries INTEGER,
  class_level class_level,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.utilization_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View utilization by scope" ON public.utilization_logs FOR SELECT USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'education_officer') AND is_subcounty_manager(auth.uid()))
  OR (has_role(auth.uid(),'center_admin') AND center_id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(),'teacher') AND center_id = get_user_center_id(auth.uid()))
  OR has_role(auth.uid(),'governor')
);
CREATE POLICY "Insert utilization by scope" ON public.utilization_logs FOR INSERT WITH CHECK (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'center_admin') AND center_id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(),'teacher') AND center_id = get_user_center_id(auth.uid()))
);
CREATE POLICY "Update utilization by scope" ON public.utilization_logs FOR UPDATE USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'center_admin') AND center_id = get_user_center_id(auth.uid()))
);
CREATE POLICY "Delete utilization by scope" ON public.utilization_logs FOR DELETE USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(),'center_admin') AND center_id = get_user_center_id(auth.uid()))
);

-- 3) Auto-apply triggers: deliveries add to stock, utilization deducts
CREATE OR REPLACE FUNCTION public.apply_ministry_delivery()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.item_id IS NOT NULL THEN
    UPDATE public.inventory_items
      SET current_quantity = current_quantity + NEW.quantity, updated_at = now()
      WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_apply_ministry_delivery AFTER INSERT ON public.ministry_deliveries
FOR EACH ROW EXECUTE FUNCTION public.apply_ministry_delivery();

CREATE OR REPLACE FUNCTION public.apply_utilization()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.inventory_items
    SET current_quantity = current_quantity - NEW.quantity, updated_at = now()
    WHERE id = NEW.item_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_apply_utilization AFTER INSERT ON public.utilization_logs
FOR EACH ROW EXECUTE FUNCTION public.apply_utilization();

-- 4) Drop suppliers
ALTER TABLE public.inventory_items DROP COLUMN IF EXISTS supplier_id;
ALTER TABLE public.stock_transactions DROP COLUMN IF EXISTS supplier_id;
DROP TABLE IF EXISTS public.suppliers;

-- 5) Extend permissions table with granular operation columns
ALTER TABLE public.permissions
  ADD COLUMN IF NOT EXISTS can_approve_subcounty BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_approve_ministry BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_reject BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_import BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_export BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_bulk_update BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_sensitive BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_transfer_center BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_change_class_level BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_activate_deactivate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_assign_staff BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_location BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_inventory BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_record_delivery BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_record_utilization BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_view_reports BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_approve_requisitions BOOLEAN DEFAULT false;

-- 6) Replace get_user_permissions to include new columns
DROP FUNCTION IF EXISTS public.get_user_permissions(uuid);
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id uuid)
RETURNS TABLE(
  resource text,
  can_create boolean, can_read boolean, can_update boolean, can_delete boolean, can_transfer boolean,
  can_approve_subcounty boolean, can_approve_ministry boolean, can_reject boolean,
  can_import boolean, can_export boolean, can_bulk_update boolean, can_view_sensitive boolean,
  can_transfer_center boolean, can_change_class_level boolean,
  can_activate_deactivate boolean, can_assign_staff boolean, can_manage_location boolean,
  can_manage_inventory boolean, can_record_delivery boolean, can_record_utilization boolean,
  can_view_reports boolean, can_approve_requisitions boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    p.resource,
    bool_or(p.can_create), bool_or(p.can_read), bool_or(p.can_update), bool_or(p.can_delete), bool_or(p.can_transfer),
    bool_or(coalesce(p.can_approve_subcounty,false)),
    bool_or(coalesce(p.can_approve_ministry,false)),
    bool_or(coalesce(p.can_reject,false)),
    bool_or(coalesce(p.can_import,false)),
    bool_or(coalesce(p.can_export,false)),
    bool_or(coalesce(p.can_bulk_update,false)),
    bool_or(coalesce(p.can_view_sensitive,false)),
    bool_or(coalesce(p.can_transfer_center,false)),
    bool_or(coalesce(p.can_change_class_level,false)),
    bool_or(coalesce(p.can_activate_deactivate,false)),
    bool_or(coalesce(p.can_assign_staff,false)),
    bool_or(coalesce(p.can_manage_location,false)),
    bool_or(coalesce(p.can_manage_inventory,false)),
    bool_or(coalesce(p.can_record_delivery,false)),
    bool_or(coalesce(p.can_record_utilization,false)),
    bool_or(coalesce(p.can_view_reports,false)),
    bool_or(coalesce(p.can_approve_requisitions,false))
  FROM public.user_roles ur
  JOIN public.permissions p ON ur.role = p.role
  WHERE ur.user_id = _user_id
  GROUP BY p.resource
$$;

-- 7) Update has_permission to handle new actions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _resource text, _action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.permissions p ON ur.role = p.role
    WHERE ur.user_id = _user_id AND p.resource = _resource AND (
      (_action = 'create' AND p.can_create) OR
      (_action = 'read' AND p.can_read) OR
      (_action = 'update' AND p.can_update) OR
      (_action = 'delete' AND p.can_delete) OR
      (_action = 'transfer' AND p.can_transfer) OR
      (_action = 'approve_subcounty' AND p.can_approve_subcounty) OR
      (_action = 'approve_ministry' AND p.can_approve_ministry) OR
      (_action = 'reject' AND p.can_reject) OR
      (_action = 'import' AND p.can_import) OR
      (_action = 'export' AND p.can_export) OR
      (_action = 'bulk_update' AND p.can_bulk_update) OR
      (_action = 'view_sensitive' AND p.can_view_sensitive) OR
      (_action = 'transfer_center' AND p.can_transfer_center) OR
      (_action = 'change_class_level' AND p.can_change_class_level) OR
      (_action = 'activate_deactivate' AND p.can_activate_deactivate) OR
      (_action = 'assign_staff' AND p.can_assign_staff) OR
      (_action = 'manage_location' AND p.can_manage_location) OR
      (_action = 'manage_inventory' AND p.can_manage_inventory) OR
      (_action = 'record_delivery' AND p.can_record_delivery) OR
      (_action = 'record_utilization' AND p.can_record_utilization) OR
      (_action = 'view_reports' AND p.can_view_reports) OR
      (_action = 'approve_requisitions' AND p.can_approve_requisitions)
    )
  )
$$;

-- 8) Seed sensible defaults for existing roles
UPDATE public.permissions SET
  can_approve_subcounty = true, can_approve_ministry = true, can_reject = true,
  can_import = true, can_export = true, can_bulk_update = true, can_view_sensitive = true,
  can_transfer_center = true, can_change_class_level = true,
  can_activate_deactivate = true, can_assign_staff = true, can_manage_location = true,
  can_manage_inventory = true, can_record_delivery = true, can_record_utilization = true,
  can_view_reports = true, can_approve_requisitions = true
WHERE role IN ('super_admin','admin');

UPDATE public.permissions SET
  can_approve_subcounty = true, can_reject = true, can_view_sensitive = true,
  can_view_reports = true, can_export = true, can_approve_requisitions = true
WHERE role = 'education_officer';

UPDATE public.permissions SET
  can_view_sensitive = true, can_record_delivery = true, can_record_utilization = true,
  can_manage_inventory = true, can_assign_staff = true, can_view_reports = true,
  can_export = true, can_change_class_level = true
WHERE role = 'center_admin';

UPDATE public.permissions SET
  can_record_utilization = true, can_view_sensitive = true
WHERE role = 'teacher';

UPDATE public.permissions SET
  can_view_reports = true, can_export = true
WHERE role = 'governor';

UPDATE public.permissions SET
  can_import = true, can_export = true, can_bulk_update = true
WHERE role = 'data_entry';
