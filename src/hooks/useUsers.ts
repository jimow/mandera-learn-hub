import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRoles extends Profile {
  roles: AppRole[];
  subCountyAssignments: {
    id: string;
    sub_county_id: string;
    sub_counties: { name: string; code: string } | null;
  }[];
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (profilesError) throw profilesError;
      
      // Fetch all user roles
      const { data: allRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");
      
      if (rolesError) throw rolesError;

      const { data: subCountyAssignments, error: assignmentsError } = await supabase
        .from("user_subcounty_assignments")
        .select("id, user_id, sub_county_id, sub_counties(name, code)")
        .eq("is_active", true);

      if (assignmentsError) throw assignmentsError;
      
      // Combine profiles with their roles
      const usersWithRoles: UserWithRoles[] = profiles.map(profile => ({
        ...profile,
        roles: allRoles
          .filter(r => r.user_id === profile.user_id)
          .map(r => r.role),
        subCountyAssignments: (subCountyAssignments || [])
          .filter((assignment) => assignment.user_id === profile.user_id)
          .map(({ id, sub_county_id, sub_counties }) => ({ id, sub_county_id, sub_counties })),
      }));
      
      return usersWithRoles;
    },
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ["users", userId],
    queryFn: async () => {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (profileError) throw profileError;
      if (!profile) return null;
      
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      if (rolesError) throw rolesError;
      
      return {
        ...profile,
        roles: roles?.map(r => r.role) || [],
        subCountyAssignments: [],
      } as UserWithRoles;
    },
    enabled: !!userId,
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { data, error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Role assigned successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign role: ${error.message}`);
    },
  });
}

export function useRemoveRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Role removed successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to remove role: ${error.message}`);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      updates 
    }: { 
      userId: string; 
      updates: Partial<Pick<Profile, "full_name" | "phone" | "is_active">> 
    }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Profile updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`);
    },
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("permissions")
        .select("*")
        .order("role");
      
      if (error) throw error;
      return data;
    },
  });
}
