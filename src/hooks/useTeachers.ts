import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCenterAssignment } from "./useUserCenterAssignment";
import { useMySubCounties } from "./useMySubCounties";

type Teacher = Database["public"]["Tables"]["teachers"]["Row"];
type TeacherInsert = Database["public"]["Tables"]["teachers"]["Insert"];
type TeacherUpdate = Database["public"]["Tables"]["teachers"]["Update"];

interface TeacherWithCenter extends Teacher {
  ecde_centers: { name: string; sub_county?: string } | null;
}

export function useTeachers(centerId?: string) {
  const { user, hasRole, isAdmin } = useAuth();
  const { data: centerAssignment, isLoading: isLoadingAssignment } = useUserCenterAssignment();
  const { data: mySubCounties, isLoading: isLoadingSubCounties } = useMySubCounties();
  
  const isCenterBased = hasRole("center_admin") || hasRole("teacher");
  const isSubCountyOfficer = !isAdmin() && (hasRole("sub_county_education_officer") || hasRole("education_officer"));
  const userCenterId = centerAssignment?.center_id;
  const subCountyNames = (mySubCounties || []).map((s) => s.name);
  
  const effectiveCenterId = centerId || (isCenterBased ? userCenterId : undefined);

  return useQuery({
    queryKey: [
      "teachers",
      user?.id,
      effectiveCenterId || (isSubCountyOfficer ? `sc:${subCountyNames.join(",")}` : "all"),
    ],
    queryFn: async () => {
      if (isCenterBased && !userCenterId) return [] as TeacherWithCenter[];
      if (isSubCountyOfficer && !isCenterBased && subCountyNames.length === 0) {
        return [] as TeacherWithCenter[];
      }

      const useInnerJoin = isSubCountyOfficer && !effectiveCenterId && subCountyNames.length > 0;
      let query = supabase
        .from("teachers")
        .select(useInnerJoin ? "*, ecde_centers!inner(name, sub_county)" : "*, ecde_centers(name)")
        .order("created_at", { ascending: false });
      
      if (effectiveCenterId) {
        query = query.eq("center_id", effectiveCenterId);
      } else if (useInnerJoin) {
        query = query.in("ecde_centers.sub_county", subCountyNames);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TeacherWithCenter[];
    },
    enabled:
      (!isCenterBased || !isLoadingAssignment) &&
      (!isSubCountyOfficer || !isLoadingSubCounties),
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
  const { hasRole } = useAuth();
  const { data: centerAssignment } = useUserCenterAssignment();
  
  const isCenterBased = hasRole("center_admin");
  const userCenterId = centerAssignment?.center_id;
  
  return useMutation({
    mutationFn: async (teacher: TeacherInsert) => {
      // Auto-assign center for center-based roles if not provided
      const teacherData = {
        ...teacher,
        center_id: teacher.center_id || (isCenterBased ? userCenterId : undefined),
      };
      
      const { data, error } = await supabase
        .from("teachers")
        .insert(teacherData)
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
