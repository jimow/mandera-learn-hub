import { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, Shield } from "lucide-react";
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
} from "@/components/ui/dropdown-menu";

// Mock data for demo
const mockUsers = [
  {
    id: "1",
    full_name: "Admin User",
    email: "admin@mandera.go.ke",
    role: "super_admin",
    is_active: true,
    created_at: "2024-01-15",
  },
  {
    id: "2",
    full_name: "Mohamed Ali",
    email: "mohamed.ali@mandera.go.ke",
    role: "admin",
    is_active: true,
    created_at: "2024-02-20",
  },
  {
    id: "3",
    full_name: "Fatuma Hassan",
    email: "fatuma.hassan@mandera.go.ke",
    role: "data_entry",
    is_active: true,
    created_at: "2024-03-10",
  },
  {
    id: "4",
    full_name: "Hussein Abdi",
    email: "hussein.abdi@mandera.go.ke",
    role: "viewer",
    is_active: true,
    created_at: "2024-04-05",
  },
  {
    id: "5",
    full_name: "Amina Osman",
    email: "amina.osman@mandera.go.ke",
    role: "data_entry",
    is_active: false,
    created_at: "2024-05-12",
  },
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case "super_admin":
      return "destructive";
    case "admin":
      return "default";
    case "data_entry":
      return "secondary";
    default:
      return "outline";
  }
}

function formatRole(role: string) {
  return role.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function UsersManagement() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = mockUsers.filter((user) =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header">
          <h1 className="page-title">Users Management</h1>
          <p className="page-description">
            Manage system users and their permissions
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </div>

      {/* Role Legend */}
      <div className="bg-card rounded-xl border border-border p-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="font-medium text-sm">Role Permissions</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <Badge variant="destructive" className="mb-1">Super Admin</Badge>
            <p className="text-xs text-muted-foreground">Full system access</p>
          </div>
          <div>
            <Badge variant="default" className="mb-1">Admin</Badge>
            <p className="text-xs text-muted-foreground">Manage data & users</p>
          </div>
          <div>
            <Badge variant="secondary" className="mb-1">Data Entry</Badge>
            <p className="text-xs text-muted-foreground">Add & edit records</p>
          </div>
          <div>
            <Badge variant="outline" className="mb-1">Viewer</Badge>
            <p className="text-xs text-muted-foreground">Read-only access</p>
          </div>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.full_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(user.role) as any}>
                    {formatRole(user.role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? "default" : "secondary"}>
                    {user.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
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
                      <DropdownMenuItem className="gap-2">
                        <Edit className="w-4 h-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-destructive">
                        <Trash2 className="w-4 h-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
