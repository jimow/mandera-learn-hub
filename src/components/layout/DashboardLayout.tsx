import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { CommandPalette, CommandPaletteTrigger } from "@/components/shared/CommandPalette";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardLayoutProps {
  children: ReactNode;
  onLogout: () => void;
}

export function DashboardLayout({ children, onLogout }: DashboardLayoutProps) {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <CommandPalette />
      <Sidebar onLogout={onLogout} />
      <main className="lg:pl-72">
        {/* Top bar with notifications */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
          <div className="flex items-center justify-between gap-4 px-6 py-3 lg:px-8">
            <CommandPaletteTrigger />
            <div className="flex items-center gap-4">
            <NotificationBell />
            {profile && (
              <div className="text-sm text-right hidden sm:block">
                <p className="font-medium">{profile.full_name}</p>
                <p className="text-xs text-muted-foreground">{profile.email}</p>
              </div>
            )}
            </div>
          </div>
        </div>
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
