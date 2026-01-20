import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CenterAssignment {
  id: string;
  user_id: string;
  center_id: string;
  assigned_at: string;
  is_active: boolean;
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
