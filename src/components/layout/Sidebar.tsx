import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  School,
  UserCog,
  Shield,
  ClipboardCheck,
  LogOut,
  Menu,
  X,
  MapPin,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCenterAssignments } from "@/hooks/useUserCenterAssignment";

interface SidebarProps {
  onLogout: () => void;
}

export function Sidebar({ onLogout }: SidebarProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { hasPermission, hasRole, isSuperAdmin, isAdmin, roles, user } = useAuth();
  
  const isCenterAdmin = hasRole("center_admin");
  const { data: centerAssignments } = useUserCenterAssignments(user?.id || "");
  const hasMultipleCenters = (centerAssignments?.filter(a => a.is_active)?.length || 0) > 1;

  // For center admins, only show ECDE Centers if they have multiple center assignments
  const showCentersMenu = isCenterAdmin 
    ? hasMultipleCenters 
    : hasPermission("centers", "read");

  // Build navigation based on permissions
  const navigation = [
    { 
      name: "Dashboard", 
      href: "/", 
      icon: LayoutDashboard,
      visible: hasPermission("dashboard", "read") || roles.length > 0,
    },
    { 
      name: "Students", 
      href: "/students", 
      icon: GraduationCap,
      visible: hasPermission("students", "read"),
    },
    { 
      name: "Teachers", 
      href: "/teachers", 
      icon: Users,
      visible: hasPermission("teachers", "read"),
    },
    { 
      name: "ECDE Centers", 
      href: "/centers", 
      icon: School,
      visible: showCentersMenu,
    },
    { 
      name: "Administrative Areas", 
      href: "/administrative-areas", 
      icon: MapPin,
      visible: isAdmin(),
    },
    { 
      name: "Users", 
      href: "/users", 
      icon: UserCog,
      visible: hasPermission("users", "read") || isSuperAdmin(),
    },
    { 
      name: "Approvals", 
      href: "/approvals", 
      icon: ClipboardCheck,
      visible: hasPermission("approvals_level1", "read") || hasPermission("approvals_level2", "read"),
    },
    { 
      name: "Roles & Permissions", 
      href: "/roles", 
      icon: Shield,
      visible: isSuperAdmin(),
    },
  ].filter(item => item.visible);

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-primary-foreground shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-sidebar transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <School className="w-6 h-6 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display font-bold text-lg text-sidebar-foreground">
                  ECDE Mandera
                </h1>
                <p className="text-xs text-sidebar-foreground/70">
                  County Government
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "nav-item",
                    isActive && "nav-item-active"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <button
              onClick={onLogout}
              className="nav-item w-full text-sidebar-foreground/70 hover:text-destructive"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
