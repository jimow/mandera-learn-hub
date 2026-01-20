import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Teacher = Database["public"]["Tables"]["teachers"]["Row"];
type TeacherInsert = Database["public"]["Tables"]["teachers"]["Insert"];
type TeacherUpdate = Database["public"]["Tables"]["teachers"]["Update"];

interface TeacherWithCenter extends Teacher {
  ecde_centers: { name: string } | null;
}

export function useTeachers() {
  return useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("*, ecde_centers(name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as TeacherWithCenter[];
    },
  });
}

export function useTeacher(id: string) {
  return useQuery({
    queryKey: ["teachers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("*, ecde_centers(name)")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as TeacherWithCenter | null;
    },
    enabled: !!id,
  });
}

export function useCreateTeacher() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (teacher: TeacherInsert) => {
      const { data, error } = await supabase
        .from("teachers")
        .insert(teacher)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher added successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add teacher: ${error.message}`);
    },
  });
}

export function useUpdateTeacher() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: TeacherUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("teachers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update teacher: ${error.message}`);
    },
  });
}

export function useDeleteTeacher() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("teachers")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      toast.success("Teacher deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete teacher: ${error.message}`);
    },
  });
}
