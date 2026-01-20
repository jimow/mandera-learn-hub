import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useApproveBySubcounty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (studentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("students")
        .update({
          approval_status: "approved_subcounty",
          approved_by_subcounty: user.id,
          subcounty_approval_date: new Date().toISOString(),
        })
        .eq("id", studentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["pending-students"] });
      toast.success("Student approved at sub-county level!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });
}

export function useApproveByMinistry() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (studentId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("students")
        .update({
          approval_status: "approved_ministry",
          approved_by_ministry: user.id,
          ministry_approval_date: new Date().toISOString(),
        })
        .eq("id", studentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["pending-students"] });
      toast.success("Student approved at ministry level!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });
}

export function useRejectStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ studentId, reason }: { studentId: string; reason: string }) => {
      const { data, error } = await supabase
        .from("students")
        .update({
          approval_status: "rejected",
          rejection_reason: reason,
        })
        .eq("id", studentId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["pending-students"] });
      toast.success("Student registration rejected");
    },
    onError: (error: Error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });
}

export function usePendingStudents(approvalLevel: "subcounty" | "ministry") {
  const status = approvalLevel === "subcounty" ? "pending" : "approved_subcounty";
  
  return {
    queryKey: ["pending-students", approvalLevel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, ecde_centers(name, sub_county, ward)")
        .eq("approval_status", status)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  };
}
