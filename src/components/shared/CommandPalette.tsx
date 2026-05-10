import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  GraduationCap,
  Users,
  School,
  LayoutDashboard,
  ClipboardCheck,
  Package,
  FileText,
  Settings,
  MapPin,
  UserCog,
  ShieldCheck,
  Map as MapIcon,
  Code2,
  Building2,
} from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { useTeachers } from "@/hooks/useTeachers";
import { useCenters } from "@/hooks/useCenters";
import { useAuth } from "@/contexts/AuthContext";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard, keywords: "home overview" },
  { label: "Students", path: "/students", icon: GraduationCap, keywords: "learners pupils pp1 pp2" },
  { label: "Teachers", path: "/teachers", icon: Users, keywords: "staff educators" },
  { label: "ECDE Centers", path: "/centers", icon: School, keywords: "schools" },
  { label: "Attendance", path: "/attendance", icon: ClipboardCheck, keywords: "register marking" },
  { label: "Approvals", path: "/approvals", icon: ShieldCheck, keywords: "pending review" },
  { label: "Inventory", path: "/inventory", icon: Package, keywords: "stock items deliveries" },
  { label: "Map View", path: "/map", icon: MapIcon, keywords: "geo location" },
  { label: "Reports", path: "/reports", icon: FileText, keywords: "analytics export" },
  { label: "Administrative Areas", path: "/administrative-areas", icon: Building2, keywords: "sub county ward" },
  { label: "Users", path: "/users", icon: UserCog, keywords: "accounts members" },
  { label: "Roles", path: "/roles", icon: ShieldCheck, keywords: "permissions rbac" },
  { label: "API Documentation", path: "/api-docs", icon: Code2, keywords: "developer keys" },
  { label: "Settings", path: "/settings", icon: Settings, keywords: "preferences config" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: students = [] } = useStudents();
  const { data: teachers = [] } = useTeachers();
  const { data: centers = [] } = useCenters();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const topStudents = useMemo(() => students.slice(0, 8), [students]);
  const topTeachers = useMemo(() => teachers.slice(0, 8), [teachers]);
  const topCenters = useMemo(() => centers.slice(0, 8), [centers]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, students, teachers, centers..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.path}
                value={`${item.label} ${item.keywords}`}
                onSelect={() => go(item.path)}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {topCenters.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Centers">
              {topCenters.map((c: any) => (
                <CommandItem
                  key={c.id}
                  value={`center ${c.name} ${c.code} ${c.ward} ${c.sub_county}`}
                  onSelect={() => go(`/centers/${c.id}`)}
                >
                  <MapPin className="mr-2 h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span>{c.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {c.code} · {c.ward}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {topStudents.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Students">
              {topStudents.map((s: any) => (
                <CommandItem
                  key={s.id}
                  value={`student ${s.full_name} ${s.admission_number}`}
                  onSelect={() => go("/students")}
                >
                  <GraduationCap className="mr-2 h-4 w-4 text-secondary" />
                  <div className="flex flex-col">
                    <span>{s.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.admission_number} · {s.ecde_centers?.name || "—"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {topTeachers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Teachers">
              {topTeachers.map((t: any) => (
                <CommandItem
                  key={t.id}
                  value={`teacher ${t.full_name} ${t.employee_number}`}
                  onSelect={() => go("/teachers")}
                >
                  <Users className="mr-2 h-4 w-4 text-accent" />
                  <div className="flex flex-col">
                    <span>{t.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {t.employee_number} · {t.ecde_centers?.name || "—"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function CommandPaletteTrigger() {
  const [, setTick] = useState(0);
  // Re-render to ensure event listener attaches on mount
  useEffect(() => setTick(1), []);

  const open = () => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  return (
    <button
      onClick={open}
      className="hidden md:inline-flex items-center gap-2 px-3 h-9 rounded-md border border-input bg-background hover:bg-accent/30 text-sm text-muted-foreground transition-colors"
      aria-label="Open command palette"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 110-16 8 8 0 010 16z" />
      </svg>
      <span>Search...</span>
      <kbd className="ml-4 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
