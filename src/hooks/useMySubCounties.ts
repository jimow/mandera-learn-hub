import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the active sub-county assignments (id + name) for the current user.
 * Used to scope UI lists for Sub-County Education Officers.
 */
export function useMySubCounties() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-subcounties", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as { id: string; name: string }[];
      const { data, error } = await supabase
        .from("user_subcounty_assignments")
        .select("sub_county_id, sub_counties(id, name)")
        .eq("user_id", user.id)
        .eq("is_active", true);
      if (error) throw error;
      return (data || [])
        .map((r: any) => r.sub_counties)
        .filter(Boolean) as { id: string; name: string }[];
    },
    enabled: !!user?.id,
  });
}
