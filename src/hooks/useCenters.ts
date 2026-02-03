import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCenterAssignment } from "./useUserCenterAssignment";

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
  
  const isCenterBased = hasRole("center_admin") || hasRole("teacher");
  const userCenterId = centerAssignment?.center_id;

  return useQuery({
    queryKey: ["centers", isCenterBased ? userCenterId : "all"],
    queryFn: async () => {
      // For center-based roles without an assignment, return empty array
      if (isCenterBased && !userCenterId) {
        return [] as CenterWithCounts[];
      }
      
      let query = supabase
        .from("ecde_centers")
        .select("*")
        .order("created_at", { ascending: false });
      
      // Filter to user's assigned center for center-based roles
      if (isCenterBased && userCenterId) {
        query = query.eq("id", userCenterId);
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
    // Wait for center assignment to load before running query for center-based users
    enabled: !isCenterBased || !isLoadingAssignment,
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
  
  return useMutation({
    mutationFn: async (center: CenterInsert) => {
      const { data, error } = await supabase
        .from("ecde_centers")
        .insert(center)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centers"] });
      toast.success("Center added successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add center: ${error.message}`);
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
