import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Permission {
  resource: string;
  can_create: boolean;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  roles: AppRole[];
  permissions: Permission[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  hasPermission: (resource: string, action: "create" | "read" | "update" | "delete") => boolean;
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  refreshRoles: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch roles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      
      if (rolesData) {
        setRoles(rolesData.map((r) => r.role));
      }

      // Fetch permissions using RPC
      const { data: permissionsData } = await supabase.rpc("get_user_permissions", {
        _user_id: userId,
      });
      
      if (permissionsData) {
        setPermissions(permissionsData as Permission[]);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };

  const refreshRoles = async () => {
    if (user) {
      await fetchUserData(user.id);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Use setTimeout to avoid race condition with database triggers
          setTimeout(() => fetchUserData(session.user.id), 100);
        } else {
          setProfile(null);
          setRoles([]);
          setPermissions([]);
        }
        setLoading(false);
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    setRoles([]);
    setPermissions([]);
  };

  const hasRole = (role: AppRole): boolean => {
    return roles.includes(role);
  };

  const hasAnyRole = (checkRoles: AppRole[]): boolean => {
    return checkRoles.some((role) => roles.includes(role));
  };

  const hasPermission = (
    resource: string,
    action: "create" | "read" | "update" | "delete"
  ): boolean => {
    // Super admins always have full access
    if (roles.includes("super_admin")) return true;
    
    const permission = permissions.find((p) => p.resource === resource);
    if (!permission) return false;
    
    switch (action) {
      case "create":
        return permission.can_create;
      case "read":
        return permission.can_read;
      case "update":
        return permission.can_update;
      case "delete":
        return permission.can_delete;
      default:
        return false;
    }
  };

  const isSuperAdmin = (): boolean => {
    return roles.includes("super_admin");
  };

  const isAdmin = (): boolean => {
    return roles.includes("super_admin") || roles.includes("admin");
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        roles,
        permissions,
        loading,
        signOut,
        hasRole,
        hasAnyRole,
        hasPermission,
        isSuperAdmin,
        isAdmin,
        refreshRoles,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
