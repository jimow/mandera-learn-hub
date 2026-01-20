import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type TeacherTransfer = Database["public"]["Tables"]["teacher_transfers"]["Row"];
type TeacherTransferInsert = Database["public"]["Tables"]["teacher_transfers"]["Insert"];

interface TeacherTransferWithDetails extends TeacherTransfer {
  from_center: { name: string } | null;
  to_center: { name: string } | null;
  teacher: { full_name: string } | null;
}

export function useTeacherTransfers(teacherId?: string) {
  return useQuery({
    queryKey: ["teacher-transfers", teacherId],
    queryFn: async () => {
      let query = supabase
        .from("teacher_transfers")
        .select(`
          *,
          from_center:ecde_centers!from_center_id(name),
          to_center:ecde_centers!to_center_id(name),
          teacher:teachers!teacher_id(full_name)
        `)
        .order("transfer_date", { ascending: false });
      
      if (teacherId) {
        query = query.eq("teacher_id", teacherId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TeacherTransferWithDetails[];
    },
  });
}

export function useCreateTeacherTransfer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transfer: TeacherTransferInsert) => {
      // First, create the transfer record
      const { data: transferData, error: transferError } = await supabase
        .from("teacher_transfers")
        .insert(transfer)
        .select()
        .single();
      
      if (transferError) throw transferError;
      
      // Then, update the teacher's center_id to the new center
      const { error: updateError } = await supabase
        .from("teachers")
        .update({ center_id: transfer.to_center_id })
        .eq("id", transfer.teacher_id);
      
      if (updateError) throw updateError;
      
      return transferData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher transferred successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to transfer teacher: ${error.message}`);
    },
  });
}

export function useCancelTeacherTransfer() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ transferId, revertToPreviousCenter }: { transferId: string; revertToPreviousCenter: boolean }) => {
      // Get the transfer record first
      const { data: transfer, error: fetchError } = await supabase
        .from("teacher_transfers")
        .select("*")
        .eq("id", transferId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update the transfer status to cancelled
      const { error: updateTransferError } = await supabase
        .from("teacher_transfers")
        .update({ status: "cancelled" })
        .eq("id", transferId);
      
      if (updateTransferError) throw updateTransferError;
      
      // Optionally revert the teacher to previous center
      if (revertToPreviousCenter && transfer.from_center_id) {
        const { error: revertError } = await supabase
          .from("teachers")
          .update({ center_id: transfer.from_center_id })
          .eq("id", transfer.teacher_id);
        
        if (revertError) throw revertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Transfer cancelled successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to cancel transfer: ${error.message}`);
    },
  });
}
