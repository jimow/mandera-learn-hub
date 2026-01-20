import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SubCounty {
  id: string;
  name: string;
  code: string;
  created_at: string;
  updated_at: string;
}

interface Ward {
  id: string;
  name: string;
  code: string;
  sub_county_id: string;
  created_at: string;
  updated_at: string;
}

export function useSubCounties() {
  return useQuery({
    queryKey: ["sub_counties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_counties")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as SubCounty[];
    },
  });
}

export function useWards(subCountyId?: string) {
  return useQuery({
    queryKey: ["wards", subCountyId],
    queryFn: async () => {
      let query = supabase.from("wards").select("*").order("name");
      
      if (subCountyId) {
        query = query.eq("sub_county_id", subCountyId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Ward[];
    },
  });
}
