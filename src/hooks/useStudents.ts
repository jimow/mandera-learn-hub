import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCenterAssignment } from "./useUserCenterAssignment";
import { useMySubCounties } from "./useMySubCounties";

type Student = Database["public"]["Tables"]["students"]["Row"];
type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
type StudentUpdate = Database["public"]["Tables"]["students"]["Update"];

interface StudentWithCenter extends Student {
  ecde_centers: { name: string; sub_county: string; ward: string } | null;
}

export function useStudents(centerId?: string) {
  const { hasRole } = useAuth();
  const { data: centerAssignment, isLoading: isLoadingAssignment } = useUserCenterAssignment();
  const { data: mySubCounties, isLoading: isLoadingSubCounties } = useMySubCounties();
  
  const isCenterBased = hasRole("center_admin") || hasRole("teacher");
  const isSubCountyOfficer = hasRole("sub_county_education_officer");
  const userCenterId = centerAssignment?.center_id;
  const subCountyNames = (mySubCounties || []).map((s) => s.name);
  
  // Use provided centerId, or user's assigned center for center-based roles
  const effectiveCenterId = centerId || (isCenterBased ? userCenterId : undefined);

  return useQuery({
    queryKey: [
      "students",
      effectiveCenterId || (isSubCountyOfficer ? `sc:${subCountyNames.join(",")}` : "all"),
    ],
    queryFn: async () => {
      // Center-based without an assignment → no data
      if (isCenterBased && !userCenterId) {
        return [] as StudentWithCenter[];
      }
      // Sub-county officer with no sub-county assignments → no data (don't fall back to RLS)
      if (isSubCountyOfficer && !isCenterBased && subCountyNames.length === 0) {
        return [] as StudentWithCenter[];
      }

      let query = supabase
        .from("students")
        .select("*, ecde_centers!inner(name, sub_county, ward)")
        .order("created_at", { ascending: false });
      
      if (effectiveCenterId) {
        query = query.eq("center_id", effectiveCenterId);
      } else if (isSubCountyOfficer && subCountyNames.length > 0) {
        query = query.in("ecde_centers.sub_county", subCountyNames);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as StudentWithCenter[];
    },
    enabled:
      (!isCenterBased || !isLoadingAssignment) &&
      (!isSubCountyOfficer || !isLoadingSubCounties),
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: ["students", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, ecde_centers(name, sub_county, ward)")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data as StudentWithCenter | null;
    },
    enabled: !!id,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const { data: centerAssignment } = useUserCenterAssignment();
  
  const isCenterBased = hasRole("center_admin") || hasRole("teacher");
  const userCenterId = centerAssignment?.center_id;
  
  return useMutation({
    mutationFn: async (student: StudentInsert) => {
      // Auto-assign center for center-based roles if not provided
      const studentData = {
        ...student,
        center_id: student.center_id || (isCenterBased ? userCenterId : undefined),
      };
      
      const { data, error } = await supabase
        .from("students")
        .insert(studentData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student added successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add student: ${error.message}`);
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: StudentUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("students")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update student: ${error.message}`);
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete student: ${error.message}`);
    },
  });
}
