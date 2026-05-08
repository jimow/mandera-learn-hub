import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCenterAssignment } from "./useUserCenterAssignment";

export type InventoryCategory = "food" | "learning_material" | "book" | "furniture" | "equipment" | "stationery" | "other";
export type StockTxType = "stock_in" | "stock_out" | "adjustment" | "distribution";
export type RequisitionStatus = "pending" | "approved" | "rejected" | "fulfilled" | "cancelled";

function useScope() {
  const { hasRole, isAdmin } = useAuth();
  const { data: assignment, isLoading } = useUserCenterAssignment();
  const isCenterBased = hasRole("center_admin") || hasRole("teacher");
  return {
    centerId: assignment?.center_id ?? null,
    isCenterBased,
    isAdmin: isAdmin(),
    isLoading,
  };
}

export function useInventoryItems(categoryFilter?: InventoryCategory) {
  const scope = useScope();
  return useQuery({
    queryKey: ["inventory_items", scope.centerId, categoryFilter],
    queryFn: async () => {
      if (scope.isCenterBased && !scope.centerId) return [];
      let q = supabase.from("inventory_items").select("*").eq("is_active", true).order("name");
      if (scope.isCenterBased && scope.centerId) q = q.eq("center_id", scope.centerId);
      if (categoryFilter) q = q.eq("category", categoryFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !scope.isCenterBased || !scope.isLoading,
  });
}

export function useStockTransactions(itemId?: string) {
  const scope = useScope();
  return useQuery({
    queryKey: ["stock_transactions", scope.centerId, itemId],
    queryFn: async () => {
      if (scope.isCenterBased && !scope.centerId) return [];
      let q = supabase.from("stock_transactions").select("*, inventory_items(name, unit, category)").order("transaction_date", { ascending: false }).limit(200);
      if (scope.isCenterBased && scope.centerId) q = q.eq("center_id", scope.centerId);
      if (itemId) q = q.eq("item_id", itemId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !scope.isCenterBased || !scope.isLoading,
  });
}

export function useRequisitions() {
  const scope = useScope();
  return useQuery({
    queryKey: ["requisitions", scope.centerId],
    queryFn: async () => {
      if (scope.isCenterBased && !scope.centerId) return [];
      let q = supabase.from("requisitions").select("*, requisition_items(*), ecde_centers(name)").order("created_at", { ascending: false });
      if (scope.isCenterBased && scope.centerId) q = q.eq("center_id", scope.centerId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !scope.isCenterBased || !scope.isLoading,
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").eq("is_active", true).order("name");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  const scope = useScope();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (item: {
      name: string;
      category: InventoryCategory;
      unit: string;
      current_quantity: number;
      reorder_level: number;
      unit_cost?: number;
      description?: string;
      sku?: string;
      supplier_id?: string | null;
      expiry_date?: string | null;
      center_id?: string;
    }) => {
      const center_id = item.center_id ?? scope.centerId;
      if (!center_id) throw new Error("No center assigned");
      const { data, error } = await supabase.from("inventory_items").insert({
        ...item,
        center_id,
        created_by: user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("Item added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from("inventory_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("Item updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteInventoryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_items").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("Item removed");
    },
  });
}

export function useCreateStockTransaction() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (tx: {
      item_id: string;
      center_id: string;
      transaction_type: StockTxType;
      quantity: number;
      unit_cost?: number;
      reason?: string;
      reference_number?: string;
      supplier_id?: string | null;
      transaction_date?: string;
      notes?: string;
    }) => {
      const { error } = await supabase.from("stock_transactions").insert({
        ...tx,
        performed_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock_transactions"] });
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("Transaction recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: { name: string; contact_person?: string; phone?: string; email?: string; address?: string }) => {
      const { error } = await supabase.from("suppliers").insert(s);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier added");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateRequisition() {
  const qc = useQueryClient();
  const scope = useScope();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      reason?: string;
      notes?: string;
      items: { item_name: string; category: InventoryCategory; quantity: number; unit?: string; item_id?: string | null; notes?: string }[];
    }) => {
      if (!scope.centerId) throw new Error("No center assigned");
      const { data: req, error } = await supabase.from("requisitions").insert({
        center_id: scope.centerId,
        requested_by: user?.id,
        reason: payload.reason,
        notes: payload.notes,
      }).select().single();
      if (error) throw error;
      const items = payload.items.map(it => ({ ...it, requisition_id: req.id }));
      const { error: e2 } = await supabase.from("requisition_items").insert(items);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast.success("Requisition submitted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateRequisitionStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RequisitionStatus }) => {
      const { error } = await supabase.from("requisitions").update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast.success("Requisition updated");
    },
  });
}
