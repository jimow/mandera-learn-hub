import { useState } from "react";
import { Search, Filter, MoreVertical, Eye, Edit, Trash2, Shield, UserPlus, X, School, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUsers, useAssignRole, useRemoveRole, useUpdateProfile } from "@/hooks/useUsers";
import { useAuth } from "@/contexts/AuthContext";
import { usePrivacy } from "@/hooks/usePrivacy";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { CenterAssignmentDialog } from "@/components/users/CenterAssignmentDialog";
import { SubCountyAssignmentDialog } from "@/components/users/SubCountyAssignmentDialog";
import type { Database } from "@/integrations/supabase/types";
import { Constants } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ALL_ROLES = Constants.public.Enums.app_role as readonly AppRole[];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case "super_admin": return "destructive";
    case "admin": return "default";
    case "center_admin": return "default";
    case "education_officer": return "secondary";
    case "governor": return "outline";
    case "teacher": return "secondary";
    case "data_entry": return "secondary";
    default: return "outline";
  }
}

function formatRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function UsersManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [centerDialogOpen, setCenterDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ userId: string; fullName: string; roles: AppRole[] } | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [roleToRemove, setRoleToRemove] = useState<{ userId: string; role: AppRole; userName: string } | null>(null);
  const [userForCenterAssignment, setUserForCenterAssignment] = useState<{ userId: string; fullName: string } | null>(null);

  const { data: users, isLoading } = useUsers();
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();
  const { isSuperAdmin, hasPermission, user, isAdmin } = useAuth();
  const { mask } = usePrivacy();

  const canManageRoles = isSuperAdmin();
  const canViewUsers = hasPermission("users", "read");
  const canManageCenters = isAdmin();

  const filteredUsers = users?.filter((u) =>
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleManageRoles = (userProfile: typeof filteredUsers[0]) => {
    setSelectedUser({
      userId: userProfile.user_id,
      fullName: userProfile.full_name,
      roles: userProfile.roles,
    });
    setSelectedRole("");
    setRoleDialogOpen(true);
  };

  const handleManageCenters = (userProfile: typeof filteredUsers[0]) => {
    setUserForCenterAssignment({
      userId: userProfile.user_id,
      fullName: userProfile.full_name,
    });
    setCenterDialogOpen(true);
  };

  const handleAssignRole = async () => {
    if (selectedUser && selectedRole) {
      await assignRole.mutateAsync({ userId: selectedUser.userId, role: selectedRole });
      setSelectedUser(prev => prev ? { ...prev, roles: [...prev.roles, selectedRole] } : null);
      setSelectedRole("");
    }
  };

  const handleRemoveRoleClick = (userId: string, role: AppRole, userName: string) => {
    setRoleToRemove({ userId, role, userName });
    setConfirmRemoveOpen(true);
  };

  const confirmRemoveRole = async () => {
    if (roleToRemove) {
      await removeRole.mutateAsync({ userId: roleToRemove.userId, role: roleToRemove.role });
      if (selectedUser && selectedUser.userId === roleToRemove.userId) {
        setSelectedUser(prev => prev ? { ...prev, roles: prev.roles.filter(r => r !== roleToRemove.role) } : null);
      }
      setConfirmRemoveOpen(false);
      setRoleToRemove(null);
    }
  };

  const availableRoles = selectedUser 
    ? ALL_ROLES.filter(role => !selectedUser.roles.includes(role))
    : ALL_ROLES;

  if (!canViewUsers && !canManageRoles) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Users Management</h1>
          <p className="page-description">Manage system users and their permissions</p>
        </div>
      </div>

      {/* Role Legend */}
      <div className="bg-card rounded-xl border border-border p-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="font-medium text-sm">Available Roles</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><Badge variant="destructive" className="mb-1">Super Admin</Badge><p className="text-xs text-muted-foreground">Full system access</p></div>
          <div><Badge variant="default" className="mb-1">Admin</Badge><p className="text-xs text-muted-foreground">Manage all data</p></div>
          <div><Badge variant="default" className="mb-1">Center Admin</Badge><p className="text-xs text-muted-foreground">Manage center data</p></div>
          <div><Badge variant="secondary" className="mb-1">Teacher</Badge><p className="text-xs text-muted-foreground">View & update students</p></div>
          <div><Badge variant="secondary" className="mb-1">Education Officer</Badge><p className="text-xs text-muted-foreground">View all data</p></div>
          <div><Badge variant="outline" className="mb-1">Governor</Badge><p className="text-xs text-muted-foreground">Dashboard view only</p></div>
          <div><Badge variant="secondary" className="mb-1">Data Entry</Badge><p className="text-xs text-muted-foreground">Add & edit records</p></div>
          <div><Badge variant="outline" className="mb-1">Viewer</Badge><p className="text-xs text-muted-foreground">Read-only access</p></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      {/* Table */}
      <div className="data-table animate-fade-in">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No users found</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((userProfile) => (
                <TableRow key={userProfile.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(userProfile.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium">{userProfile.full_name}</span>
                        {userProfile.user_id === user?.id && (
                          <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{mask(userProfile.email)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {userProfile.roles.length > 0 ? (
                        userProfile.roles.map((role) => (
                          <Badge key={role} variant={getRoleBadgeVariant(role) as any}>
                            {formatRole(role)}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-sm">No roles assigned</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={userProfile.is_active ? "default" : "secondary"}>
                      {userProfile.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(userProfile.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2">
                          <Eye className="w-4 h-4" /> View Details
                        </DropdownMenuItem>
                        {canManageRoles && (
                          <DropdownMenuItem className="gap-2" onClick={() => handleManageRoles(userProfile)}>
                            <Shield className="w-4 h-4" /> Manage Roles
                          </DropdownMenuItem>
                        )}
                        {canManageCenters && (
                          <DropdownMenuItem className="gap-2" onClick={() => handleManageCenters(userProfile)}>
                            <School className="w-4 h-4" /> Assign Centers
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Manage Roles Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Manage Roles for {selectedUser?.fullName}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Current Roles */}
            <div>
              <h4 className="text-sm font-medium mb-3">Current Roles</h4>
              <div className="flex flex-wrap gap-2">
                {selectedUser?.roles.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No roles assigned</p>
                ) : (
                  selectedUser?.roles.map((role) => (
                    <Badge key={role} variant={getRoleBadgeVariant(role) as any} className="gap-1 pr-1">
                      {formatRole(role)}
                      <button
                        onClick={() => handleRemoveRoleClick(selectedUser.userId, role, selectedUser.fullName)}
                        className="ml-1 hover:bg-background/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Add Role */}
            {availableRoles.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3">Add Role</h4>
                <div className="flex gap-2">
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {formatRole(role)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAssignRole} 
                    disabled={!selectedRole || assignRole.isPending}
                    className="gap-1"
                  >
                    <UserPlus className="w-4 h-4" />
                    {assignRole.isPending ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Remove Role Dialog */}
      <DeleteConfirmDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        onConfirm={confirmRemoveRole}
        title="Remove Role"
        description={`Are you sure you want to remove the "${roleToRemove ? formatRole(roleToRemove.role) : ""}" role from ${roleToRemove?.userName}?`}
        isLoading={removeRole.isPending}
      />

      {/* Center Assignment Dialog */}
      <CenterAssignmentDialog
        open={centerDialogOpen}
        onOpenChange={setCenterDialogOpen}
        user={userForCenterAssignment}
      />
    </div>
  );
}
