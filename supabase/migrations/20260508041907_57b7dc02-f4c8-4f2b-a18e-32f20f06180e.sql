
-- Enums
CREATE TYPE public.inventory_category AS ENUM ('food', 'learning_material', 'book', 'furniture', 'equipment', 'stationery', 'other');
CREATE TYPE public.stock_transaction_type AS ENUM ('stock_in', 'stock_out', 'adjustment', 'distribution');
CREATE TYPE public.requisition_status AS ENUM ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled');

-- Suppliers
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory items (per center)
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL,
  name TEXT NOT NULL,
  category public.inventory_category NOT NULL,
  description TEXT,
  sku TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  current_quantity NUMERIC NOT NULL DEFAULT 0,
  reorder_level NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  expiry_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inventory_items_center ON public.inventory_items(center_id);
CREATE INDEX idx_inventory_items_category ON public.inventory_items(category);

-- Stock transactions (in/out history)
CREATE TABLE public.stock_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  center_id UUID NOT NULL,
  transaction_type public.stock_transaction_type NOT NULL,
  quantity NUMERIC NOT NULL,
  unit_cost NUMERIC DEFAULT 0,
  reason TEXT,
  reference_number TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  performed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stock_tx_item ON public.stock_transactions(item_id);
CREATE INDEX idx_stock_tx_center ON public.stock_transactions(center_id);

-- Requisitions
CREATE TABLE public.requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id UUID NOT NULL,
  requested_by UUID,
  status public.requisition_status NOT NULL DEFAULT 'pending',
  reason TEXT,
  notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.requisition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID NOT NULL REFERENCES public.requisitions(id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  category public.inventory_category NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT DEFAULT 'pcs',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: auto adjust current_quantity on stock_transactions
CREATE OR REPLACE FUNCTION public.apply_stock_transaction()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.transaction_type = 'stock_in' THEN
    UPDATE public.inventory_items SET current_quantity = current_quantity + NEW.quantity, updated_at = now() WHERE id = NEW.item_id;
  ELSIF NEW.transaction_type IN ('stock_out', 'distribution') THEN
    UPDATE public.inventory_items SET current_quantity = current_quantity - NEW.quantity, updated_at = now() WHERE id = NEW.item_id;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    UPDATE public.inventory_items SET current_quantity = NEW.quantity, updated_at = now() WHERE id = NEW.item_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_stock_transaction
AFTER INSERT ON public.stock_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_transaction();

-- updated_at triggers
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inventory_items_updated BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_requisitions_updated BEFORE UPDATE ON public.requisitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requisition_items ENABLE ROW LEVEL SECURITY;

-- Suppliers: viewable by all roles, manageable by admins
CREATE POLICY "Authenticated can view suppliers" ON public.suppliers FOR SELECT USING (has_any_role(auth.uid()));
CREATE POLICY "Admins manage suppliers" ON public.suppliers FOR ALL USING (is_admin(auth.uid()));

-- Inventory items
CREATE POLICY "View inventory by center scope" ON public.inventory_items FOR SELECT USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'education_officer'::app_role) AND is_subcounty_manager(auth.uid()))
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(), 'teacher'::app_role) AND center_id = get_user_center_id(auth.uid()))
  OR has_role(auth.uid(), 'governor'::app_role)
);
CREATE POLICY "Insert inventory by center scope" ON public.inventory_items FOR INSERT WITH CHECK (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
);
CREATE POLICY "Update inventory by center scope" ON public.inventory_items FOR UPDATE USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
);
CREATE POLICY "Delete inventory by center scope" ON public.inventory_items FOR DELETE USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
);

-- Stock transactions
CREATE POLICY "View tx by center scope" ON public.stock_transactions FOR SELECT USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'education_officer'::app_role) AND is_subcounty_manager(auth.uid()))
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
  OR (has_role(auth.uid(), 'teacher'::app_role) AND center_id = get_user_center_id(auth.uid()))
  OR has_role(auth.uid(), 'governor'::app_role)
);
CREATE POLICY "Insert tx by center scope" ON public.stock_transactions FOR INSERT WITH CHECK (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
);

-- Requisitions
CREATE POLICY "View requisitions by scope" ON public.requisitions FOR SELECT USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'education_officer'::app_role) AND is_subcounty_manager(auth.uid()))
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
);
CREATE POLICY "Insert requisitions by center" ON public.requisitions FOR INSERT WITH CHECK (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
);
CREATE POLICY "Update requisitions" ON public.requisitions FOR UPDATE USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
);
CREATE POLICY "Delete requisitions" ON public.requisitions FOR DELETE USING (
  is_admin(auth.uid())
  OR (has_role(auth.uid(), 'center_admin'::app_role) AND center_id = get_user_center_id(auth.uid()))
);

-- Requisition items: tie permission to parent requisition
CREATE POLICY "View req items via parent" ON public.requisition_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.requisitions r WHERE r.id = requisition_id AND (
    is_admin(auth.uid())
    OR (has_role(auth.uid(), 'education_officer'::app_role) AND is_subcounty_manager(auth.uid()))
    OR (has_role(auth.uid(), 'center_admin'::app_role) AND r.center_id = get_user_center_id(auth.uid()))
  ))
);
CREATE POLICY "Manage req items via parent" ON public.requisition_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.requisitions r WHERE r.id = requisition_id AND (
    is_admin(auth.uid())
    OR (has_role(auth.uid(), 'center_admin'::app_role) AND r.center_id = get_user_center_id(auth.uid()))
  ))
);
