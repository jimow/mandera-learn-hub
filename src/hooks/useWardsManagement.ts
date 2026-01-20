import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Ward {
  id: string;
  name: string;
  code: string;
  sub_county_id: string;
  created_at: string;
  updated_at: string;
}

interface WardWithSubCounty extends Ward {
  sub_counties?: { name: string; county_id: string | null } | null;
}

export function useWardsWithSubCounty() {
  return useQuery({
    queryKey: ["wards_with_subcounty"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wards")
        .select("*, sub_counties(name, county_id)")
        .order("name");
      
      if (error) throw error;
      return data as WardWithSubCounty[];
    },
  });
}

export function useCreateWard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ward: Omit<Ward, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("wards")
        .insert(ward)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      queryClient.invalidateQueries({ queryKey: ["wards_with_subcounty"] });
      toast.success("Ward added successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add ward: ${error.message}`);
    },
  });
}

export function useUpdateWard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Ward> & { id: string }) => {
      const { data, error } = await supabase
        .from("wards")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      queryClient.invalidateQueries({ queryKey: ["wards_with_subcounty"] });
      toast.success("Ward updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update ward: ${error.message}`);
    },
  });
}

export function useDeleteWard() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("wards")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wards"] });
      queryClient.invalidateQueries({ queryKey: ["wards_with_subcounty"] });
      toast.success("Ward deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete ward: ${error.message}`);
    },
  });
}
