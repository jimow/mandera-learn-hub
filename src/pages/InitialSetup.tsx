import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function InitialSetup() {
  const navigate = useNavigate();
  const { user, profile, refreshRoles, roles } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasSuperAdmin, setHasSuperAdmin] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    checkSuperAdminExists();
  }, []);

  const checkSuperAdminExists = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role", "super_admin")
        .limit(1);

      if (error) throw error;

      const exists = data && data.length > 0;
      setHasSuperAdmin(exists);
      
      // If super admin already exists, redirect to dashboard
      if (exists) {
        setTimeout(() => navigate("/"), 2000);
      }
    } catch (error) {
      console.error("Error checking super admin:", error);
    } finally {
      setChecking(false);
    }
  };

  const handleBecomeAdmin = async () => {
    if (!user) {
      toast.error("You must be logged in to perform this action");
      return;
    }

    setAssigning(true);
    try {
      // Double-check no super admin exists (race condition protection)
      const { data: existingAdmins } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role", "super_admin")
        .limit(1);

      if (existingAdmins && existingAdmins.length > 0) {
        toast.error("A super admin has already been assigned");
        setHasSuperAdmin(true);
        return;
      }

      // Assign super_admin role to current user
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "super_admin" });

      if (error) throw error;

      setSuccess(true);
      toast.success("You are now the Super Admin!");
      
      // Refresh roles in auth context
      await refreshRoles();
      
      // Redirect to dashboard after a moment
      setTimeout(() => navigate("/"), 2000);
    } catch (error: any) {
      toast.error(`Failed to assign role: ${error.message}`);
    } finally {
      setAssigning(false);
    }
  };

  // Already a super admin, redirect
  if (roles.includes("super_admin")) {
    navigate("/");
    return null;
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Checking system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            {success ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : hasSuperAdmin ? (
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            ) : (
              <Shield className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="font-display text-2xl">
            {success
              ? "Setup Complete!"
              : hasSuperAdmin
              ? "System Already Configured"
              : "Initial System Setup"}
          </CardTitle>
          <CardDescription className="text-base">
            {success
              ? "You have been assigned as the Super Admin. Redirecting to dashboard..."
              : hasSuperAdmin
              ? "A Super Admin has already been assigned. Redirecting to dashboard..."
              : "Welcome! This system needs an initial Super Admin to manage users and permissions."}
          </CardDescription>
        </CardHeader>

        {!hasSuperAdmin && !success && (
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium">As Super Admin, you will be able to:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Manage all students, teachers, and ECDE centers
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Assign roles to other users
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Configure permissions for each role
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Access all system features
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Important Notice
                  </p>
                  <p className="text-amber-700 dark:text-amber-300 mt-1">
                    This action can only be performed once. Make sure you are the intended administrator for this system.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Logged in as: <strong>{profile?.email || user?.email}</strong>
              </p>
              <Button
                onClick={handleBecomeAdmin}
                disabled={assigning}
                size="lg"
                className="w-full gap-2"
              >
                {assigning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Assigning Role...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    Become Super Admin
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
