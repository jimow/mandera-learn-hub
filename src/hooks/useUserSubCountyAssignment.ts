import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SubCountyAssignment {
  id: string;
  user_id: string;
  sub_county_id: string;
  assigned_at: string;
  is_active: boolean;
  assigned_by: string | null;
  sub_counties: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export function useUserSubCountyAssignments(userId: string) {
  return useQuery({
    queryKey: ["user_subcounty_assignments", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_subcounty_assignments")
        .select("*, sub_counties(id, name, code)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return data as SubCountyAssignment[];
    },
    enabled: !!userId,
  });
}

export function useAssignSubCounty() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ userId, subCountyId }: { userId: string; subCountyId: string }) => {
      // Reactivate if exists, else insert
      const { data: existing } = await supabase
        .from("user_subcounty_assignments")
        .select("id")
        .eq("user_id", userId)
        .eq("sub_county_id", subCountyId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_subcounty_assignments")
          .update({ is_active: true, assigned_by: user?.id })
          .eq("id", existing.id);
        if (error) throw error;
        return existing;
      }
      const { data, error } = await supabase
        .from("user_subcounty_assignments")
        .insert({ user_id: userId, sub_county_id: subCountyId, assigned_by: user?.id, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["user_subcounty_assignments", vars.userId] });
      toast.success("Sub-county assigned");
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });
}

export function useRemoveSubCountyAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, userId }: { assignmentId: string; userId: string }) => {
      const { error } = await supabase
        .from("user_subcounty_assignments")
        .update({ is_active: false })
        .eq("id", assignmentId);
      if (error) throw error;
      return { userId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user_subcounty_assignments", data.userId] });
      toast.success("Sub-county removed");
    },
    onError: (e: Error) => toast.error(`Failed: ${e.message}`),
  });
}
