import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCenterAssignment } from "./useUserCenterAssignment";
import { useMySubCounties } from "./useMySubCounties";

type Center = Database["public"]["Tables"]["ecde_centers"]["Row"];
type CenterInsert = Database["public"]["Tables"]["ecde_centers"]["Insert"];
type CenterUpdate = Database["public"]["Tables"]["ecde_centers"]["Update"];

interface CenterWithCounts extends Center {
  students_count?: number;
  teachers_count?: number;
}

export function useCenters() {
  const { hasRole } = useAuth();
  const { data: centerAssignment, isLoading: isLoadingAssignment } = useUserCenterAssignment();
  const { data: mySubCounties, isLoading: isLoadingSubCounties } = useMySubCounties();
  
  const isCenterBased = hasRole("center_admin") || hasRole("teacher");
  const isSubCountyOfficer = hasRole("sub_county_education_officer");
  const userCenterId = centerAssignment?.center_id;
  const subCountyNames = (mySubCounties || []).map((s) => s.name);

  return useQuery({
    queryKey: [
      "centers",
      isCenterBased ? `center:${userCenterId}` : isSubCountyOfficer ? `sc:${subCountyNames.join(",")}` : "all",
    ],
    queryFn: async () => {
      // For center-based roles without an assignment, return empty array
      if (isCenterBased && !userCenterId) {
        return [] as CenterWithCounts[];
      }
      // For sub-county officer without assignments, return empty
      if (isSubCountyOfficer && !isCenterBased && subCountyNames.length === 0) {
        return [] as CenterWithCounts[];
      }
      
      let query = supabase
        .from("ecde_centers")
        .select("*")
        .order("created_at", { ascending: false });
      
      // Filter to user's assigned center for center-based roles
      if (isCenterBased && userCenterId) {
        query = query.eq("id", userCenterId);
      } else if (isSubCountyOfficer && subCountyNames.length > 0) {
        // Filter to assigned sub-counties for sub-county officer
        query = query.in("sub_county", subCountyNames);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Get counts for each center
      const centersWithCounts = await Promise.all(
        data.map(async (center) => {
          const [studentsResult, teachersResult] = await Promise.all([
            supabase
              .from("students")
              .select("id", { count: "exact", head: true })
              .eq("center_id", center.id),
            supabase
              .from("teachers")
              .select("id", { count: "exact", head: true })
              .eq("center_id", center.id),
          ]);
          
          return {
            ...center,
            students_count: studentsResult.count || 0,
            teachers_count: teachersResult.count || 0,
          };
        })
      );
      
      return centersWithCounts as CenterWithCounts[];
    },
    // Wait for relevant assignments to load
    enabled:
      (!isCenterBased || !isLoadingAssignment) &&
      (!isSubCountyOfficer || !isLoadingSubCounties),
  });
}

export function useCenter(id: string) {
  return useQuery({
    queryKey: ["centers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecde_centers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCenter() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  
  return useMutation({
    mutationFn: async (center: CenterInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      // Admins create centers as already approved; others submit as pending
      const payload: any = {
        ...center,
        submitted_by: user?.id ?? null,
        approval_status: isAdmin() ? "approved" : "pending",
      };
      const { data, error } = await supabase
        .from("ecde_centers")
        .insert(payload)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-centers"] });
      toast.success(
        data?.approval_status === "approved"
          ? "Center added successfully!"
          : "Center submitted for approval!"
      );
    },
    onError: (error: Error) => {
      toast.error(`Failed to add center: ${error.message}`);
    },
  });
}

// Center approval hooks
export function useApproveCenterL1() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (centerId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("ecde_centers")
        .update({
          approval_status: "approved_l1",
          approved_l1_by: user.id,
          approved_l1_at: new Date().toISOString(),
        } as any)
        .eq("id", centerId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-centers"] });
      toast.success("Center approved at L1!");
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });
}

export function useApproveCenterL2() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (centerId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("ecde_centers")
        .update({
          approval_status: "approved",
          approved_l2_by: user.id,
          approved_l2_at: new Date().toISOString(),
        } as any)
        .eq("id", centerId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-centers"] });
      toast.success("Center fully approved!");
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });
}

export function useRejectCenter() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ centerId, reason }: { centerId: string; reason: string }) => {
      const { data, error } = await supabase
        .from("ecde_centers")
        .update({
          approval_status: "rejected",
          rejection_reason: reason,
        } as any)
        .eq("id", centerId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      queryClient.invalidateQueries({ queryKey: ["pending-centers"] });
      toast.success("Center registration rejected");
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });
}

export function usePendingCenters(level: "l1" | "l2") {
  const status = level === "l1" ? "pending" : "approved_l1";
  return useQuery({
    queryKey: ["pending-centers", level],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ecde_centers")
        .select("*")
        .eq("approval_status", status)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateCenter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: CenterUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("ecde_centers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      toast.success("Center updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update center: ${error.message}`);
    },
  });
}

export function useDeleteCenter() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("ecde_centers")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      toast.success("Center deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete center: ${error.message}`);
    },
  });
}
