import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CenterAssignment {
  id: string;
  user_id: string;
  center_id: string;
  assigned_at: string;
  is_active: boolean;
  assigned_by: string | null;
  ecde_centers: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export function useUserCenterAssignment() {
  const { user, hasRole } = useAuth();
  const isCenterAdmin = hasRole("center_admin");

  return useQuery({
    queryKey: ["user_center_assignment", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_center_assignments")
        .select("*, ecde_centers(id, name, code)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as CenterAssignment | null;
    },
    enabled: !!user && isCenterAdmin,
  });
}

// Get all center assignments for a specific user
export function useUserCenterAssignments(userId: string) {
  return useQuery({
    queryKey: ["user_center_assignments", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_center_assignments")
        .select("*, ecde_centers(id, name, code)")
        .eq("user_id", userId)
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return data as CenterAssignment[];
    },
    enabled: !!userId,
  });
}

// Assign a center to a user
export function useAssignCenter() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, centerId }: { userId: string; centerId: string }) => {
      // First, deactivate any existing active assignments for this user
      await supabase
        .from("user_center_assignments")
        .update({ is_active: false })
        .eq("user_id", userId)
        .eq("is_active", true);

      // Then create a new assignment
      const { data, error } = await supabase
        .from("user_center_assignments")
        .insert({
          user_id: userId,
          center_id: centerId,
          assigned_by: user?.id,
          is_active: true,
        })
        .select("*, ecde_centers(id, name, code)")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user_center_assignments", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["user_center_assignment"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Center assigned successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign center: ${error.message}`);
    },
  });
}

// Remove a center assignment
export function useRemoveCenterAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assignmentId, userId }: { assignmentId: string; userId: string }) => {
      const { error } = await supabase
        .from("user_center_assignments")
        .update({ is_active: false })
        .eq("id", assignmentId);

      if (error) throw error;
      return { userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user_center_assignments", data.userId] });
      queryClient.invalidateQueries({ queryKey: ["user_center_assignment"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Center assignment removed!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove assignment: ${error.message}`);
    },
  });
}
