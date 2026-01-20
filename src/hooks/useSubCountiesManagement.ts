import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SubCounty {
  id: string;
  name: string;
  code: string;
  county_id: string | null;
  created_at: string;
  updated_at: string;
}

interface SubCountyWithCounty extends SubCounty {
  counties?: { name: string } | null;
}

export function useSubCountiesWithCounty() {
  return useQuery({
    queryKey: ["sub_counties_with_county"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_counties")
        .select("*, counties(name)")
        .order("name");
      
      if (error) throw error;
      return data as SubCountyWithCounty[];
    },
  });
}

export function useCreateSubCounty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (subCounty: Omit<SubCounty, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("sub_counties")
        .insert(subCounty)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub_counties"] });
      queryClient.invalidateQueries({ queryKey: ["sub_counties_with_county"] });
      toast.success("Sub-County added successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add sub-county: ${error.message}`);
    },
  });
}

export function useUpdateSubCounty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SubCounty> & { id: string }) => {
      const { data, error } = await supabase
        .from("sub_counties")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub_counties"] });
      queryClient.invalidateQueries({ queryKey: ["sub_counties_with_county"] });
      toast.success("Sub-County updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update sub-county: ${error.message}`);
    },
  });
}

export function useDeleteSubCounty() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sub_counties")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sub_counties"] });
      queryClient.invalidateQueries({ queryKey: ["sub_counties_with_county"] });
      toast.success("Sub-County deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete sub-county: ${error.message}`);
    },
  });
}
