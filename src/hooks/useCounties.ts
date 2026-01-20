import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface County {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

export function useCounties() {
  return useQuery({
    queryKey: ["counties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("counties")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as County[];
    },
  });
}

export function useCreateCounty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (county: Omit<County, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("counties")
        .insert(county)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counties"] });
      toast.success("County added successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add county: ${error.message}`);
    },
  });
}

export function useUpdateCounty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<County> & { id: string }) => {
      const { data, error } = await supabase
        .from("counties")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counties"] });
      toast.success("County updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update county: ${error.message}`);
    },
  });
}

export function useDeleteCounty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("counties")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["counties"] });
      toast.success("County deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete county: ${error.message}`);
    },
  });
}
