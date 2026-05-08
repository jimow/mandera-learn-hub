import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCenterAssignment } from "./useUserCenterAssignment";

export type InventoryCategory = "food" | "learning_material" | "book" | "furniture" | "equipment" | "stationery" | "other";
export type StockTxType = "stock_in" | "stock_out" | "adjustment" | "distribution";
export type RequisitionStatus = "pending" | "approved" | "approved_l1" | "approved_l2" | "rejected" | "fulfilled" | "cancelled";

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
      // Ministry items (center_id IS NULL) are visible to everyone with a role.
      // Center-based users also see their own center's items.
      let q = supabase.from("inventory_items").select("*").eq("is_active", true).order("name");
      if (scope.isCenterBased && scope.centerId) {
        q = q.or(`center_id.is.null,center_id.eq.${scope.centerId}`);
      }
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

export function useMinistryDeliveries() {
  const scope = useScope();
  return useQuery({
    queryKey: ["ministry_deliveries", scope.centerId],
    queryFn: async () => {
      if (scope.isCenterBased && !scope.centerId) return [];
      let q = supabase.from("ministry_deliveries").select("*, ecde_centers(name), inventory_items(name, unit)").order("delivery_date", { ascending: false });
      if (scope.isCenterBased && scope.centerId) q = q.eq("center_id", scope.centerId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !scope.isCenterBased || !scope.isLoading,
  });
}

export function useUtilizationLogs() {
  const scope = useScope();
  return useQuery({
    queryKey: ["utilization_logs", scope.centerId],
    queryFn: async () => {
      if (scope.isCenterBased && !scope.centerId) return [];
      let q = supabase.from("utilization_logs").select("*, ecde_centers(name), inventory_items(name, unit, category)").order("utilization_date", { ascending: false });
      if (scope.isCenterBased && scope.centerId) q = q.eq("center_id", scope.centerId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !scope.isCenterBased || !scope.isLoading,
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
      expiry_date?: string | null;
      center_id?: string | null;
    }) => {
      // Ministry/admin items have no center; center-admin items are tied to their center.
      const center_id = item.center_id !== undefined
        ? item.center_id
        : (scope.isCenterBased ? scope.centerId : null);
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

export function useCreateMinistryDelivery() {
  const qc = useQueryClient();
  const scope = useScope();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (d: {
      item_id?: string | null;
      item_name: string;
      category: InventoryCategory;
      quantity: number;
      unit?: string;
      delivery_date?: string;
      delivered_by?: string;
      reference_number?: string;
      notes?: string;
      center_id?: string;
    }) => {
      const center_id = d.center_id ?? scope.centerId;
      if (!center_id) throw new Error("No center assigned");
      const { error } = await supabase.from("ministry_deliveries").insert({
        ...d,
        center_id,
        item_id: d.item_id ?? null,
        recorded_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ministry_deliveries"] });
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("Delivery recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateUtilizationLog() {
  const qc = useQueryClient();
  const scope = useScope();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (u: {
      item_id: string;
      quantity: number;
      utilization_date?: string;
      purpose?: string;
      beneficiaries?: number;
      class_level?: "pp1" | "pp2" | null;
      notes?: string;
      center_id?: string;
    }) => {
      const center_id = u.center_id ?? scope.centerId;
      if (!center_id) throw new Error("No center assigned");
      const { error } = await supabase.from("utilization_logs").insert({
        ...u,
        center_id,
        recorded_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["utilization_logs"] });
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      toast.success("Utilization recorded");
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
      // Fire-and-forget AI anomaly analysis
      supabase.functions.invoke("analyze-requisition", { body: { requisition_id: req.id } })
        .catch(err => console.warn("anomaly analysis failed", err));
      return req;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast.success("Requisition submitted — AI is analyzing for anomalies");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useAnalyzeRequisition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("analyze-requisition", { body: { requisition_id: id } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast.success("AI analysis complete");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateRequisitionStatus() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: RequisitionStatus; notes?: string }) => {
      const updates: any = { status };
      const now = new Date().toISOString();
      if (status === "approved_l1") {
        updates.approved_l1_by = user?.id;
        updates.approved_l1_at = now;
        if (notes) updates.approved_l1_notes = notes;
      } else if (status === "approved" || status === "approved_l2") {
        updates.approved_l2_by = user?.id;
        updates.approved_l2_at = now;
        if (notes) updates.approved_l2_notes = notes;
        updates.reviewed_by = user?.id;
        updates.reviewed_at = now;
      } else {
        updates.reviewed_by = user?.id;
        updates.reviewed_at = now;
      }
      const { error } = await supabase.from("requisitions").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["requisitions"] });
      toast.success("Requisition updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

