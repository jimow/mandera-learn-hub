import { useState } from "react";
import { Shield, ChevronDown, ChevronUp, Check, X, Edit2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { usePermissions } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: "Full system access. Can manage all data, users, and permissions.",
  admin: "Administrative access. Can manage students, teachers, centers, and view users.",
  center_admin: "Center-level management. Can manage students and update their center.",
  teacher: "Teaching staff. Can view students and update their records.",
  education_officer: "Ministry oversight. Can view all data for reporting purposes.",
  governor: "Executive dashboard. Read-only access to county-wide statistics.",
  data_entry: "Data clerk. Can add and edit student and teacher records.",
  viewer: "Observer. Read-only access to students, teachers, and centers.",
};

const RESOURCES = ["students", "teachers", "centers", "users", "roles", "dashboard"];
const APPROVAL_LEVELS = ["approvals_level1", "approvals_level2"];

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case "super_admin": return "destructive";
    case "admin": return "default";
    case "center_admin": return "default";
    default: return "secondary";
  }
}

export default function RolesManagement() {
  const { data: permissions, isLoading } = usePermissions();
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [openRoles, setOpenRoles] = useState<string[]>(["super_admin"]);
  const [editingPermission, setEditingPermission] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  if (!isSuperAdmin()) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Only Super Admins can manage roles and permissions.</p>
        </div>
      </div>
    );
  }

  const toggleRole = (role: string) => {
    setOpenRoles(prev => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  // Group permissions by role
  const permissionsByRole = permissions?.reduce((acc, perm) => {
    if (!acc[perm.role]) acc[perm.role] = [];
    acc[perm.role].push(perm);
    return acc;
  }, {} as Record<string, typeof permissions>) || {};

  const allRoles = Object.keys(permissionsByRole) as AppRole[];

  // Helper to get approval permission for a role
  const getApprovalPermission = (role: string, level: string) => {
    return permissionsByRole[role]?.find(p => p.resource === level);
  };

  // Filter out approval resources from regular permissions display
  const getRegularPermissions = (role: string) => {
    return permissionsByRole[role]?.filter(p => !APPROVAL_LEVELS.includes(p.resource)) || [];
  };

  const handlePermissionChange = async (permissionId: string, field: string, value: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("permissions")
        .update({ [field]: value } as any)
        .eq("id", permissionId);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["permissions"] });
      toast.success("Permission updated successfully");
    } catch (error: any) {
      toast.error(`Failed to update permission: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Roles & Permissions</h1>
        <p className="page-description">Configure what each role can do in the system</p>
      </div>

      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Permission Matrix
          </CardTitle>
          <CardDescription>
            Click on a role to expand and view/edit its permissions. Toggle switches to grant or revoke access.
          </CardDescription>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading permissions...</div>
      ) : (
        <div className="space-y-4">
          {allRoles.map((role) => (
            <Card key={role} className="overflow-hidden">
              <Collapsible open={openRoles.includes(role)} onOpenChange={() => toggleRole(role)}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={getRoleBadgeVariant(role) as any}>
                          {formatRole(role)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {ROLE_DESCRIPTIONS[role]}
                        </span>
                      </div>
                      {openRoles.includes(role) ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-3 font-medium text-sm">Resource</th>
                            <th className="text-center p-3 font-medium text-sm w-20">Create</th>
                            <th className="text-center p-3 font-medium text-sm w-20">Read</th>
                            <th className="text-center p-3 font-medium text-sm w-20">Update</th>
                            <th className="text-center p-3 font-medium text-sm w-20">Delete</th>
                            <th className="text-center p-3 font-medium text-sm w-20">Transfer</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getRegularPermissions(role)?.map((perm) => (
                            <tr key={perm.id} className="border-t">
                              <td className="p-3 font-medium capitalize">{perm.resource}</td>
                              <td className="p-3 text-center">
                                <Switch
                                  checked={perm.can_create ?? false}
                                  onCheckedChange={(v) => handlePermissionChange(perm.id, "can_create", v)}
                                  disabled={saving || role === "super_admin"}
                                />
                              </td>
                              <td className="p-3 text-center">
                                <Switch
                                  checked={perm.can_read ?? false}
                                  onCheckedChange={(v) => handlePermissionChange(perm.id, "can_read", v)}
                                  disabled={saving || role === "super_admin"}
                                />
                              </td>
                              <td className="p-3 text-center">
                                <Switch
                                  checked={perm.can_update ?? false}
                                  onCheckedChange={(v) => handlePermissionChange(perm.id, "can_update", v)}
                                  disabled={saving || role === "super_admin"}
                                />
                              </td>
                              <td className="p-3 text-center">
                                <Switch
                                  checked={perm.can_delete ?? false}
                                  onCheckedChange={(v) => handlePermissionChange(perm.id, "can_delete", v)}
                                  disabled={saving || role === "super_admin"}
                                />
                              </td>
                              <td className="p-3 text-center">
                                <Switch
                                  checked={perm.can_transfer ?? false}
                                  onCheckedChange={(v) => handlePermissionChange(perm.id, "can_transfer", v)}
                                  disabled={saving || role === "super_admin" || perm.resource !== "teachers"}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    {/* Approval Permissions - Simplified */}
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-3">Approval Permissions</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left p-3 font-medium text-sm">Approval Level</th>
                              <th className="text-center p-3 font-medium text-sm w-32">Can View</th>
                              <th className="text-center p-3 font-medium text-sm w-32">Can Approve</th>
                            </tr>
                          </thead>
                          <tbody>
                            {APPROVAL_LEVELS.map((level) => {
                              const perm = getApprovalPermission(role, level);
                              const levelLabel = level === "approvals_level1" ? "Level 1 (Sub-County)" : "Level 2 (Ministry)";
                              return (
                                <tr key={level} className="border-t">
                                  <td className="p-3 font-medium">{levelLabel}</td>
                                  <td className="p-3 text-center">
                                    {perm ? (
                                      <Switch
                                        checked={perm.can_read ?? false}
                                        onCheckedChange={(v) => handlePermissionChange(perm.id, "can_read", v)}
                                        disabled={saving || role === "super_admin"}
                                      />
                                    ) : (
                                      <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    {perm ? (
                                      <Switch
                                        checked={perm.can_update ?? false}
                                        onCheckedChange={(v) => handlePermissionChange(perm.id, "can_update", v)}
                                        disabled={saving || role === "super_admin"}
                                      />
                                    ) : (
                                      <span className="text-muted-foreground text-sm">-</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {role === "super_admin" && (
                      <p className="text-xs text-muted-foreground mt-2">
                        * Super Admin permissions cannot be modified. This role always has full access.
                      </p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
